# APIHub

An all-in-one console for the AI services you pay for — DeepSeek, Groq, and (soon) more.
Connect a provider once, then use every model from a single **unified key**, with usage
tracking built in.

![Stack](https://img.shields.io/badge/React_19-TypeScript-7c6cff) ![Vite](https://img.shields.io/badge/Vite-8-4cc9f0)

## Features

- **Dashboard** — total requests, tokens spent (prompt/completion), average latency,
  14-day request & token charts, traffic split by provider, top models and a live
  feed of recent requests.
- **Services** — add a provider with a name, endpoint and API key. The model catalog
  is **fetched automatically** as soon as the endpoint + key are in place, and
  re-synced when stale. Keys are stored locally in your browser and can be
  revealed/copied per service.
- **Unified API** — create `ah-…` keys with optional monthly token/request limits,
  browse every model across all services, and chat with any of them in the
  streaming playground. Every request is attributed to the selected key and feeds
  the dashboard. (Reasoning models show a collapsible "Reasoning" block.)

## Getting started

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 and add your first service (Groq or DeepSeek).

### Testing without real API keys

A mock OpenAI-compatible provider ships with the repo:

```bash
node scripts/mock-provider.mjs   # serves http://localhost:4111
```

Add a service with endpoint `http://localhost:4111` and any API-key value — you'll
get three fake models and streaming chat replies, so you can try the whole flow
without spending tokens.

## How it works

- **Storage** — everything (services, unified keys, usage history) lives in your
  browser's `localStorage` under the `apihub.v1` prefix. Nothing leaves your machine.
- **Provider calls** — the app calls provider endpoints directly from the browser.
  If a provider blocks cross-origin requests, the call automatically falls back to
  the dev-server proxy (`/proxy/groq`, `/proxy/deepseek` in `vite.config.ts`), so
  `npm run dev` (or `vite preview`) is the supported way to run the app.
- **Model addressing** — models are addressed as `provider/model-id`, e.g.
  `groq/llama-3.3-70b-versatile` or `deepseek/deepseek-chat`. This is the same
  scheme the upcoming gateway will accept.

## Roadmap

- **Backend gateway** (Node.js + Fastify): an OpenAI-compatible
  `POST /v1/chat/completions` + `GET /v1/models` endpoint so the unified key works
  from any client, anywhere — not just in the playground.
- **Custom providers** — any OpenAI-compatible endpoint with a name and base URL.
- **More analytics** — cost estimates, per-key spend caps enforced at the gateway.

## Project structure

```
frontend/
├── scripts/mock-provider.mjs   # optional mock provider for local testing
└── src/
    ├── lib/                    # providers, streaming chat, usage stats, storage
    ├── store/                  # app state (context + localStorage persistence)
    ├── components/             # sidebar, modals, toasts, playground, …
    └── pages/                  # Dashboard, Services, UnifiedApi
```
