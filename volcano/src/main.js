import { DOM_loaded_promise } from "./utils/icg_web.js";

async function main() {
  console.log("Hello, World!");
}

DOM_loaded_promise.then(main);
