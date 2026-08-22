# Responsive Dashboard and Reactive Schedule Design

## Goal

Show the last known dashboard and schedule data immediately, keep it live from
the local reactive database, preserve global navigation through route changes,
and make calendar-event actions complete on every schedule surface.

## Data lifecycle

MMKV is the durable, synchronous snapshot store. At session bootstrap it is
hydrated into an in-memory view cache before routes render. A screen therefore
reads an in-memory snapshot on its first render. WatermelonDB remains the
authoritative client-side projection: its RxJS observers replace snapshots as
soon as they emit, and existing synchronization/socket writes keep those
observers current. Snapshot writes happen after live observations, so there is
no manual refresh path and no network-loading fallback.

Snapshots remain user-scoped. Time-sensitive calendar snapshots are additionally
scoped by their visible day/range to avoid briefly displaying the prior day.
Session clearing removes both the durable and in-memory snapshots.

## Navigation lifecycle

When auth is already signed in, the root route mounts `DashboardScreen`
directly. It must not first render a blank destination-resolution view. That
keeps a `DashboardShell` mounted during a dashboard-tab replacement, so the
root-owned bottom navigation retains an owner while the existing stack fade
runs.

## Schedule interactions

Calendar events already have REST create/update/delete support and an adaptive
form. Every schedule view will route event presses to that form. A reusable
entry-action controller will open the same adaptive action sheet from mobile
long press; it exposes event edit/delete and the existing permitted task
actions. Deleting still requires the global confirmation dialog. Reminder rows
remain read-only because the backend does not expose mutation endpoints for
them.

The event identity is carried through day timelines instead of resolving an
entry by title, so duplicate event names cannot open the wrong appointment.

## Responsive dashboard rhythm

Paired Projects and Today sections equalize only while they share a row. On a
stacked compact dashboard each panel uses content height; this avoids blank
canvases below a one-row task list. The Cameras empty panel receives its own
compact minimum height, matching the intentional footprint of a dashboard
section without borrowing a desktop-side-column fill rule.

## Constraints

- Use Uniwind semantic classes; native style objects only where RN layout APIs
  require them.
- Keep WatermelonDB access behind services and existing observable hooks.
- Do not introduce a manual data-refresh UI or a loading fallback for cached
  dashboard/schedule data.
- Preserve permission checks and confirmation before destructive operations.
- Do not create a commit or push automatically.
