import { Router, type IRouter } from "express";
import {
  SearchEventsQueryParams,
  SearchEventsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type TicketmasterEvent = {
  id?: string;
  name?: string;
  url?: string;
  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
    }>;
  };
};

type TicketmasterResponse = {
  _embedded?: { events?: TicketmasterEvent[] };
};

router.get("/events/search", async (req, res): Promise<void> => {
  const parsed = SearchEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter an event, team, artist, or venue." });
    return;
  }

  const apiKey = process.env.TICKETMASTER_API_KEY?.trim();
  if (!apiKey) {
    req.log.error("Ticketmaster API key is not configured");
    res.status(503).json({ error: "Live event search is temporarily unavailable." });
    return;
  }

  const keyword = parsed.data.keyword.trim();
  const params = new URLSearchParams({
    apikey: apiKey,
    keyword,
    size: "20",
    sort: "date,asc",
  });

  // Ticketmaster's city filter keeps the most common Blue Jays search focused
  // on the team's Toronto home events rather than unrelated results.
  if (keyword.toLowerCase().includes("blue jays")) {
    params.set("city", "Toronto");
  }

  try {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      req.log.warn(
        { statusCode: response.status },
        "Ticketmaster returned an unsuccessful response",
      );
      const message =
        response.status === 401
          ? "The Ticketmaster API key was rejected. Please update the server secret."
          : "Ticketmaster could not complete that search.";
      res.status(502).json({ error: message });
      return;
    }

    const data = (await response.json()) as TicketmasterResponse;
    const events = (data._embedded?.events ?? [])
      .filter((event): event is Required<Pick<TicketmasterEvent, "id" | "name" | "url">> & TicketmasterEvent =>
        Boolean(event.id && event.name && event.url),
      )
      .map((event) => {
        const venue = event._embedded?.venues?.[0];
        return {
          id: event.id,
          name: event.name,
          date: event.dates?.start?.localDate ?? "Date to be announced",
          time: event.dates?.start?.localTime ?? null,
          venue: venue?.name ?? "Venue to be announced",
          city: venue?.city?.name ?? "Location to be announced",
          url: event.url,
        };
      });

    res.json(SearchEventsResponse.parse(events));
  } catch (error) {
    req.log.error({ err: error }, "Ticketmaster request failed");
    res.status(502).json({ error: "We couldn't reach Ticketmaster. Please try again." });
  }
});

export default router;
