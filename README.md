# CarteadoDev

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.2.2.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Deploy on Vercel

- This project includes a `vercel.json` configured for SPA routing and Angular build output.
- Configure a Vercel environment variable for realtime:
  - `WS_URL` (recommended), e.g. `wss://<your-partykit-host>/parties/main/:roomId`
- Optional fallbacks recognized by the runtime endpoint:
  - `PARTYKIT_WS_URL`
  - `NEXT_PUBLIC_WS_URL`
- During runtime, the app fetches `/api/ws-url` to resolve the websocket URL in production.

## PartyKit deploy

- PartyKit config is in `partykit.json` with entrypoint `partykit/server.ts`.
- Available scripts:
  - `npm run partykit:dev`
  - `npm run partykit:deploy`
- Room endpoint pattern:
  - `ws(s)://<partykit-host>/parties/main/:roomId`
- The client supports room interpolation in `WS_URL`:
  - `:roomId` or `{roomId}`
  - Example: `wss://<your-partykit-host>/parties/main/:roomId`

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
