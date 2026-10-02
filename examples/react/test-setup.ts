import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount everything rendered by a test before the next one starts. Testing
// Library does this automatically only when the runner exposes global
// `afterEach`, and this config keeps vitest's globals off.
afterEach(cleanup);
