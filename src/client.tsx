import { hydrate } from "preact";
import { App } from "./app";
import { createStore, StoreContext } from "./store";
import { type State, viewFromPath, authModalFromPath } from "./data";
import "./style.css";
import "./light.css";
import "./auth.css";
const state = JSON.parse(
  document.getElementById("bootstrap")!.textContent!,
) as State;
const store = createStore(
  state,
  viewFromPath(location.pathname),
  state.account ? "" : authModalFromPath(location.pathname),
);
hydrate(
  <StoreContext.Provider value={store}>
    <App />
  </StoreContext.Provider>,
  document.getElementById("app")!,
);
