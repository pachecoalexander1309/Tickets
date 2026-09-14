import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  MapPin,
  Search,
  ShieldCheck,
  Ticket,
  X,
} from 'lucide-react';
import {
  getCompareTicketsQueryKey,
  getSearchEventsQueryKey,
  type TicketComparison,
  type TicketListing,
  useSearchEvents,
  useCompareTickets,
  type Event,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  useEffect(() => {
    if (!selectedEvent) return;
    window.history.replaceState(null, '', '#ticket-comparison');
    requestAnimationFrame(() => {
      document
        .getElementById('ticket-comparison')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [selectedEvent]);
  const searchParams = useMemo(
    () => ({ keyword: submittedQuery }),
    [submittedQuery],
  );
  const searchKey = getSearchEventsQueryKey(searchParams);
  const {
    data: events,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useSearchEvents(searchParams, {
    query: {
      enabled: Boolean(submittedQuery),
      queryKey: searchKey,
    },
  });
  const compareParams = useMemo(
    () => ({
      eventUrl: selectedEvent?.url ?? '',
      eventName: selectedEvent?.name ?? '',
      eventDate: selectedEvent?.date ?? null,
    }),
    [selectedEvent],
  );
  const compareQuery = useCompareTickets(compareParams, {
    query: {
      enabled: Boolean(selectedEvent),
      queryKey: getCompareTicketsQueryKey(compareParams),
    },
  });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = query.trim();
    if (nextQuery) setSubmittedQuery(nextQuery);
  };

  const choosePrompt = (prompt: string) => {
    setQuery(prompt);
    setSubmittedQuery(prompt);
  };

  const clearSearch = () => {
    setQuery('');
    setSubmittedQuery('');
    setSelectedEvent(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3" data-testid="brand-ticketcompare">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Ticket size={19} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-[-0.02em]">
                SeatScout
              </div>
              <div className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                official routes only
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-5 sm:flex">
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Live event search
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[hsl(157_35%_40%)]" />
              <span>Ticketmaster data</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="paper-grid border-b border-border">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-20 lg:px-10 lg:pt-24">
            <div>
              <div className="mb-6 flex items-center gap-3 font-mono-ui text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                <span className="h-px w-8 bg-primary" />
                Find the right door
              </div>
              <h1 className="max-w-3xl text-balance text-[clamp(3.25rem,8vw,7rem)] font-semibold leading-[0.9] tracking-[-0.07em]">
                Your next night out,{' '}
                <span className="font-editorial font-normal italic tracking-[-0.055em] text-primary">
                  without the noise.
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Search thousands of live events and go straight to the official
                ticket source. No invented prices. No marketplace maze. Just a
                clear route to the door.
              </p>

              <form
                onSubmit={submitSearch}
                className="mt-9 flex max-w-2xl flex-col gap-3 sm:flex-row"
                role="search"
                aria-label="Search live events"
              >
                <div className="relative flex min-h-14 flex-1 items-center rounded-md border border-input bg-card shadow-sm transition-colors focus-within:border-primary">
                  <Search
                    className="ml-4 shrink-0 text-muted-foreground"
                    size={19}
                    aria-hidden="true"
                  />
                  <label className="sr-only" htmlFor="event-search">
                    Search for an artist, team, venue, or event
                  </label>
                  <input
                    id="event-search"
                    data-testid="input-event-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                     placeholder="What event are you looking for?"
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground/75"
                    maxLength={120}
                    autoComplete="off"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      data-testid="button-clear-search"
                      aria-label="Clear search"
                      className="mr-2 rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-foreground soft-focus"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  data-testid="button-search-events"
                  disabled={!query.trim()}
                  className="soft-focus inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-primary px-7 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Search events
                  <ArrowUpRight size={17} aria-hidden="true" />
                </button>
              </form>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono-ui text-[10px] text-primary">TIP</span>
                Try an artist, a city, or a venue name.
              </div>
            </div>

            <aside className="self-end border-l border-border pl-5 sm:pl-7 lg:mb-2">
              <div className="mb-5 flex items-center gap-2 text-sm font-bold">
                <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
                A more direct ticket search
              </div>
              <div className="space-y-5">
                <TrustPoint
                  number="01"
                  title="Live results"
                  detail="Pulled from the official Ticketmaster event feed."
                />
                <TrustPoint
                  number="02"
                  title="Useful details"
                  detail="See the date, venue, city, and start time before you click."
                />
                <TrustPoint
                  number="03"
                  title="One clear next step"
                  detail="Every result links to its official ticket page."
                />
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
          {!submittedQuery && (
            <PromptSection onChoose={choosePrompt} />
          )}

          {submittedQuery && (
            <ResultsSection
              query={submittedQuery}
              events={events ?? []}
              isLoading={isLoading || isFetching}
              isError={isError}
              onRetry={() => void refetch()}
              onReset={clearSearch}
              onCompare={setSelectedEvent}
            />
          )}
          {selectedEvent && (
            <ComparisonSection
              event={selectedEvent}
              data={compareQuery.data}
              isLoading={compareQuery.isLoading || compareQuery.isFetching}
              isError={compareQuery.isError}
              error={compareQuery.error}
              onRetry={() => void compareQuery.refetch()}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </section>

        <section className="border-y border-border bg-secondary/55">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-3 md:gap-0 lg:px-10">
            <MiniPrinciple
              icon={<Check size={16} aria-hidden="true" />}
              title="Official by default"
              detail="We send you to the primary ticket source."
            />
            <MiniPrinciple
              icon={<CalendarDays size={16} aria-hidden="true" />}
              title="The details that matter"
              detail="Date, time, venue, city. Quickly scannable."
            />
            <MiniPrinciple
              icon={<ChevronRight size={16} aria-hidden="true" />}
              title="Less wandering"
              detail="Search once, choose your event, move on."
            />
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <span data-testid="text-footer-brand">SeatScout / a clearer way in</span>
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em]">
           Ticketmaster events · Tickets.dev sandbox comparisons
        </span>
      </footer>
    </div>
  );
}

function TrustPoint({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3" data-testid={`trust-point-${number}`}>
      <span className="font-mono-ui pt-0.5 text-[10px] text-primary">{number}</span>
      <div>
        <div className="text-sm font-bold">{title}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function PromptSection({ onChoose }: { onChoose: (prompt: string) => void }) {
  const prompts = [
    { label: 'Concerts in New York', query: 'concerts in New York' },
    { label: 'NBA games', query: 'NBA' },
    { label: 'Broadway shows', query: 'Broadway' },
    { label: 'Live music in Austin', query: 'live music Austin' },
  ];

  return (
    <div data-testid="section-popular-prompts">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Start somewhere
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Popular searches
          </h2>
        </div>
        <p className="max-w-xs text-sm leading-5 text-muted-foreground sm:text-right">
          Shortcuts to get you moving. You can always search for something more
          specific.
        </p>
      </div>
      <div className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        {prompts.map((prompt, index) => (
          <button
            key={prompt.query}
            type="button"
            onClick={() => onChoose(prompt.query)}
            data-testid={`button-popular-${index}`}
            className="soft-focus group flex min-h-[118px] flex-col justify-between rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-card"
          >
            <span className="font-mono-ui text-[10px] text-muted-foreground">
              0{index + 1}
            </span>
            <span className="flex items-center justify-between gap-3 text-sm font-bold">
              {prompt.label}
              <ArrowUpRight
                size={16}
                className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultsSection({
  query,
  events,
  isLoading,
  isError,
  onRetry,
  onReset,
  onCompare,
}: {
  query: string;
  events: Event[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onReset: () => void;
  onCompare: (event: Event) => void;
}) {
  return (
    <div data-testid="section-search-results">
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Search results
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
            Events for <span className="font-editorial font-normal italic">“{query}”</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          data-testid="button-new-search"
          className="soft-focus inline-flex w-fit items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:border-primary hover:text-foreground"
        >
          <Search size={14} aria-hidden="true" />
          New search
        </button>
      </div>

      {isLoading && <ResultsSkeleton />}

      {!isLoading && isError && (
        <div
          className="my-8 flex flex-col items-start gap-4 rounded-md border border-destructive/35 bg-destructive/5 p-6 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex gap-3">
            <CircleAlert className="mt-0.5 shrink-0 text-destructive" size={20} aria-hidden="true" />
            <div>
              <div className="font-bold" data-testid="status-search-error">
                We couldn’t load those events.
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                The event service may be taking a breather. Try the search again.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetry}
            data-testid="button-retry-search"
            className="soft-focus rounded-sm bg-foreground px-4 py-2 text-xs font-bold text-background hover:opacity-85"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <div
          className="my-8 rounded-md border border-dashed border-border bg-card p-8 text-center sm:p-12"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Search size={19} aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-bold" data-testid="status-no-results">
            No events found
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Try a broader artist, team, city, or venue name. We only show results
            returned by the official event feed.
          </p>
        </div>
      )}

      {!isLoading && !isError && events.length > 0 && (
        <div
          className="mt-6 space-y-3"
          role="list"
          aria-label={`${events.length} event results`}
          aria-live="polite"
        >
          <div className="mb-4 flex items-center justify-between font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span data-testid="text-result-count">
              {events.length} {events.length === 1 ? 'event' : 'events'} found
            </span>
            <span>Official listings</span>
          </div>
          {events.map((event) => (
            <EventCard key={event.id} event={event} onCompare={onCompare} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div
      className="mt-6 space-y-3"
      data-testid="status-loading-results"
      aria-label="Loading events"
      role="status"
      aria-live="polite"
    >
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex min-h-[142px] animate-pulse flex-col gap-5 rounded-md border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-3">
            <div className="h-5 w-56 rounded-sm bg-muted" />
            <div className="h-3 w-40 rounded-sm bg-muted" />
            <div className="h-3 w-48 rounded-sm bg-muted" />
          </div>
          <div className="h-10 w-32 rounded-sm bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EventCard({
  event,
  onCompare,
}: {
  event: Event;
  onCompare: (event: Event) => void;
}) {
  return (
    <article
      role="listitem"
      className="result-card ticket-divider rounded-md border border-border bg-card p-5 sm:p-6"
      data-testid={`card-event-${event.id}`}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3
            className="max-w-2xl text-lg font-bold leading-snug tracking-[-0.025em] sm:text-xl"
            data-testid={`text-event-name-${event.id}`}
          >
            {event.name}
          </h3>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-7 sm:gap-y-2">
            <InfoLine icon={<CalendarDays size={15} aria-hidden="true" />} value={formatEventDate(event.date)} />
            {event.time && (
              <InfoLine icon={<Clock3 size={15} aria-hidden="true" />} value={formatEventTime(event.time)} />
            )}
            <InfoLine icon={<MapPin size={15} aria-hidden="true" />} value={`${event.venue} · ${event.city}`} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => onCompare(event)}
            data-testid={`button-compare-tickets-${event.id}`}
            className="soft-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-85"
          >
            Compare tickets
            <ArrowDownUp size={15} aria-hidden="true" />
          </button>
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            data-testid={`link-official-tickets-${event.id}`}
            className="soft-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-border px-4 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
          >
            View tickets
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="ticket-divider-line mt-5 flex items-center justify-between pt-3 font-mono-ui text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
        <span>Ticketmaster listing</span>
        <span>Event ID {event.id.slice(0, 8)}</span>
      </div>
    </article>
  );
}

function ComparisonSection({
  event,
  data,
  isLoading,
  isError,
  error,
  onRetry,
  onClose,
}: {
  event: Event;
  data: TicketComparison | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [sortBy, setSortBy] = useState<'price' | 'value' | 'section'>('price');
  const listings = useMemo(() => {
    const result = [...(data?.listings ?? [])];
    return result.sort((a, b) => {
      if (sortBy === 'section') {
        return (
          a.section.localeCompare(b.section, undefined, { numeric: true }) ||
          a.totalPrice - b.totalPrice
        );
      }

      if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
      if (sortBy === 'value') return b.quantity - a.quantity;
      return a.marketplace.localeCompare(b.marketplace);
    });
  }, [data?.listings, sortBy]);

  const marketplaceCount = new Set(
    listings.map((listing) => listing.marketplace),
  ).size;
  const comparisonError = getComparisonErrorMessage(error);

  return (
    <section
      id="ticket-comparison"
      className="mt-14 border-t border-border pt-10"
      data-testid="section-ticket-comparison"
    >
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Seller price comparison
            </span>
            <span className="rounded-sm bg-primary/15 px-2 py-1 font-mono-ui text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
              DEMO DATA
            </span>
          </div>
          <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
            Compare sellers for{' '}
            <span className="font-editorial font-normal italic">
              “{event.name}”
            </span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Sandbox listings from Tickets.dev. These are not live ticket prices.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="button-close-comparison"
          className="soft-focus inline-flex w-fit items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:border-primary hover:text-foreground"
        >
          <X size={14} aria-hidden="true" />
          Close comparison
        </button>
      </div>

      {isLoading && <ComparisonSkeleton />}

      {!isLoading && isError && (
        <div
          className="my-8 flex flex-col items-start gap-4 rounded-md border border-destructive/35 bg-destructive/5 p-6 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex gap-3">
            <CircleAlert
              className="mt-0.5 shrink-0 text-destructive"
              size={20}
              aria-hidden="true"
            />
            <div>
              <div className="font-bold">No cross-seller comparison available</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {comparisonError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetry}
            data-testid="button-retry-comparison"
            className="soft-focus rounded-sm bg-foreground px-4 py-2 text-xs font-bold text-background hover:opacity-85"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && data && listings.length === 0 && (
        <div
          className="my-8 rounded-md border border-dashed border-border bg-card p-8 text-center sm:p-12"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Ticket size={19} aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-bold">
            No cross-seller listings found
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Tickets.dev does not currently map this event to more than one seller
            in the sandbox.
          </p>
        </div>
      )}

      {!isLoading && !isError && data && listings.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {listings.length} listings · {marketplaceCount} marketplaces ·{' '}
              {data.currency}
            </div>
            <label className="flex items-center gap-2 text-xs font-bold">
              <span className="text-muted-foreground">Sort by</span>
              <select
                value={sortBy}
                onChange={(input) =>
                  setSortBy(input.target.value as 'price' | 'value' | 'section')
                }
                data-testid="select-comparison-sort"
                className="soft-focus rounded-sm border border-input bg-card px-3 py-2 text-xs font-bold outline-none focus:border-primary"
              >
                <option value="price">Lowest total price</option>
                <option value="value">Best value</option>
                <option value="section">Section</option>
              </select>
            </label>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function getComparisonErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Tickets.dev did not return two seller sources for this event, so Ticketmaster-only prices are not shown as a comparison.';
  }

  const data = (error as { data?: unknown }).data;
  if (data && typeof data === 'object') {
    const message = (data as { error?: unknown }).error;
    if (typeof message === 'string' && message.trim()) return message;
  }

  return 'The sandbox ticket service could not complete this comparison. Try again.';
}

function ComparisonSkeleton() {
  return (
    <div className="mt-6 grid gap-3 lg:grid-cols-2" data-testid="status-loading-comparison">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="min-h-[240px] animate-pulse rounded-md border border-border bg-card p-5"
        >
          <div className="h-3 w-24 rounded-sm bg-muted" />
          <div className="mt-5 h-6 w-32 rounded-sm bg-muted" />
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="h-10 rounded-sm bg-muted" />
            <div className="h-10 rounded-sm bg-muted" />
            <div className="h-10 rounded-sm bg-muted" />
            <div className="h-10 rounded-sm bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingCard({ listing }: { listing: TicketListing }) {
  return (
    <article
      className="result-card rounded-md border border-border bg-card p-5 sm:p-6"
      data-testid={`card-listing-${listing.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            {listing.marketplace}
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-[-0.05em]">
            {formatMoney(listing.totalPrice, listing.currency)}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">per ticket · all-in</p>
        </div>
        <span className="rounded-sm border border-border px-2 py-1 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          DEMO DATA
        </span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-4 text-sm">
        <ListingDetail label="Section" value={listing.section} />
        <ListingDetail label="Row" value={listing.row} />
        <ListingDetail label="Quantity" value={`${listing.quantity} tickets`} />
        <ListingDetail
          label="Ticket price"
          value={formatMoney(listing.ticketPrice, listing.currency)}
        />
        <ListingDetail
          label="Fees"
          value={formatMoney(listing.fees, listing.currency)}
        />
        <ListingDetail label="Currency" value={listing.currency} />
      </div>
      {listing.url && (
        <a
          href={listing.url}
          target="_blank"
          rel="noreferrer"
          className="soft-focus mt-6 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm border border-border px-4 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
        >
          View listing
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

function ListingDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(value);
}

function InfoLine({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2" data-testid={`text-event-detail-${value}`}>
      <span className="text-primary">{icon}</span>
      <span>{value}</span>
    </div>
  );
}

function formatEventDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatEventTime(value: string) {
  const [hour = '', minute = ''] = value.split(':');
  const hourNumber = Number(hour);
  if (Number.isNaN(hourNumber) || !minute) return value;
  const suffix = hourNumber >= 12 ? 'PM' : 'AM';
  const displayHour = hourNumber % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function MiniPrinciple({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 md:border-r md:border-border md:px-8 first:pl-0 last:border-0 last:pr-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-background text-primary">
        {icon}
      </div>
      <div>
        <div className="text-sm font-bold">{title}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
