import { hydrate } from "preact";
import { App } from "./app";
import { createStore, StoreContext } from "./store";
import { type State, viewFromPath } from "./data";
import "./style.css";
import "./light.css";
const state = JSON.parse(
  document.getElementById("bootstrap")!.textContent!,
) as State;
const store = createStore(state, viewFromPath(location.pathname));
hydrate(
  <StoreContext.Provider value={store}>
    <App />
  </StoreContext.Provider>,
  document.getElementById("app")!,
);
