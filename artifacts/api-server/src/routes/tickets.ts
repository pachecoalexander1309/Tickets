import { Router, type IRouter } from "express";
import {
  CompareTicketsQueryParams,
  CompareTicketsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const TICKETS_DEV_BASE_URL = "https://api.tickets.dev/v1";
const MARKETPLACE_PRIORITY = [
  "ticketmaster",
  "stubhub",
  "vividseats",
  "seatgeek",
];

type TicketsDevSource = {
  marketplace?: string;
  url?: string;
};

type TicketsDevEvent = {
  name?: string;
  eventDateLocal?: string;
  venue?: { name?: string; city?: string };
  sources?: TicketsDevSource[];
};

type TicketsDevEventsResponse = {
  events?: TicketsDevEvent[];
};

type TicketsDevListing = {
  listingId?: string;
  section?: string;
  row?: string;
  quantity?: number;
  ticketPrice?: number;
  fee?: number;
  totalPrice?: number;
  listingUrl?: string;
  url?: string;
};

type TicketsDevSnapshot = {
  source?: string;
  eventName?: string;
  eventDateLocal?: string;
  venueName?: string;
  venueCity?: string;
  sourceUrl?: string;
  currency?: string;
  listings?: TicketsDevListing[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

router.get("/tickets/compare", async (req, res): Promise<void> => {
  const parsed = CompareTicketsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Select an event before comparing tickets." });
    return;
  }

  const { eventUrl, eventName, eventDate } = parsed.data;
  let selectedEventUrl: URL;
  try {
    selectedEventUrl = new URL(eventUrl);
  } catch {
    res.status(400).json({ error: "That event does not have a valid ticket URL." });
    return;
  }

  const isTicketmasterHost =
    selectedEventUrl.hostname.endsWith("ticketmaster.com") ||
    selectedEventUrl.hostname.endsWith("ticketmaster.ca");
  if (!isTicketmasterHost) {
    res.status(400).json({ error: "Only Ticketmaster events are supported in this MVP." });
    return;
  }

  const apiKey = process.env.TICKETS_DEV_API_KEY?.trim();
  if (!apiKey || !apiKey.startsWith("tk_test_")) {
    req.log.error("Tickets.dev sandbox key is missing or not a test key");
    res.status(503).json({ error: "Sandbox ticket comparison is not configured." });
    return;
  }

  const headers = { Accept: "application/json", "x-api-key": apiKey };

  try {
    const discoveryQuery = eventName.replace(/\s*\([^)]*\)/g, "").trim();
    const discoveryParams = new URLSearchParams({
      query: discoveryQuery || eventName,
      pageSize: "10",
    });

    const discoveryResponse = await fetch(
      `${TICKETS_DEV_BASE_URL}/events?${discoveryParams.toString()}`,
      { headers },
    );
    const discovery = await readJson<TicketsDevEventsResponse>(discoveryResponse);

    if (!discoveryResponse.ok) {
      req.log.warn(
        { statusCode: discoveryResponse.status },
        "Tickets.dev event discovery failed",
      );
    }

    const matchedEvent =
      discovery?.events?.find((event) =>
        event.sources?.some(
          (source) => source.url === selectedEventUrl.toString(),
        ),
      ) ??
      discovery?.events?.find((event) => event.sources?.length);

    const discoveredSources =
      matchedEvent?.sources
        ?.filter(
          (source): source is Required<TicketsDevSource> =>
            Boolean(source.marketplace && source.url),
        )
        .sort((a, b) => {
          const aIndex = MARKETPLACE_PRIORITY.indexOf(a.marketplace);
          const bIndex = MARKETPLACE_PRIORITY.indexOf(b.marketplace);
          return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
        }) ?? [];

    const sources = [
      { marketplace: "ticketmaster", url: selectedEventUrl.toString() },
      ...discoveredSources,
    ].filter(
      (source, index, all) =>
        all.findIndex((candidate) => candidate.marketplace === source.marketplace) ===
        index,
    );

    const captures = await Promise.all(
      sources.slice(0, 4).map(async (source) => {
        const captureParams = new URLSearchParams({ url: source.url });
        const response = await fetch(
          `${TICKETS_DEV_BASE_URL}/capture?${captureParams.toString()}`,
          { headers },
        );
        const snapshot = await readJson<TicketsDevSnapshot>(response);

        if (!response.ok || !snapshot) {
          req.log.warn(
            {
              marketplace: source.marketplace,
              statusCode: response.status,
            },
            "Tickets.dev marketplace capture failed",
          );
          return null;
        }

        return { source, snapshot };
      }),
    );

    const successfulCaptures = captures.filter(
      (capture): capture is NonNullable<typeof capture> => Boolean(capture),
    );
    if (!successfulCaptures.length) {
      res.status(502).json({
        error: "Tickets.dev could not load sandbox listings for this event.",
      });
      return;
    }

    const firstSnapshot = successfulCaptures[0].snapshot;
    const currency =
      successfulCaptures.find((capture) => capture.snapshot.currency)?.snapshot
        .currency ?? "USD";

    const listings = successfulCaptures.flatMap(({ source, snapshot }) =>
      (snapshot.listings ?? [])
        .filter((listing) => isFiniteNumber(listing.totalPrice))
        .map((listing, index) => ({
          id: `${source.marketplace}-${listing.listingId ?? index}-${listing.section ?? "unknown"}-${listing.row ?? "unknown"}`,
          marketplace: snapshot.source || source.marketplace,
          section: listing.section || "Section not listed",
          row: listing.row || "Row not listed",
          quantity: isFiniteNumber(listing.quantity) ? listing.quantity : 0,
          ticketPrice: isFiniteNumber(listing.ticketPrice)
            ? listing.ticketPrice
            : 0,
          fees: isFiniteNumber(listing.fee) ? listing.fee : 0,
          totalPrice: listing.totalPrice ?? 0,
          currency: snapshot.currency || currency,
          url: listing.listingUrl || listing.url || snapshot.sourceUrl || source.url,
        })),
    );

    res.json(
      CompareTicketsResponse.parse({
        eventName: firstSnapshot.eventName || matchedEvent?.name || eventName,
        eventDate:
          firstSnapshot.eventDateLocal?.slice(0, 10) ||
          matchedEvent?.eventDateLocal?.slice(0, 10) ||
          eventDate ||
          "Date to be announced",
        venue: firstSnapshot.venueName || matchedEvent?.venue?.name || "Venue not listed",
        city: firstSnapshot.venueCity || matchedEvent?.venue?.city || "City not listed",
        currency,
        demoData: true,
        listings,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Tickets.dev comparison request failed");
    res.status(502).json({
      error: "We couldn't load sandbox listings. Please try again.",
    });
  }
});

export default router;