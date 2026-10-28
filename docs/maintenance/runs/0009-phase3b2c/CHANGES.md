# Changes

Starting checkout: clean `main`, `cf3dad3592b9873b8c366ca8ed98b613256c90b3`. The earlier Phase 3B.2b work was already committed before this task. No commits were created here.

`operationOwnership.js` now obtains an exclusive `.admission-lock` around counting and claim creation. It retries contention for approximately one second, then refuses admission. It never steals an interrupted lock. The lock is removed in finally during normal execution; partial project claims remain capacity-consuming and blocked. Release still requires the unchanged full-tree proof and does not acquire the admission lock.

`build_bundle.py --validation-dir <isolated scratch directory>` builds only a fresh validation VSIX, with exclusive creation and a byte-for-byte comparison of every packaged input. It does not overwrite release archives or build a source bundle. Default release behavior is preserved.

Added six admission tests, one bounded native lifecycle/resource test, and installed-package/two-host/reload harnesses in `tools/phase3b2c`. The installed-package test activates runtime code and the native executable from the isolated installed extension path. It does not load production modules from the checkout.

No supervisor/native source or binary changes, version bump, public command/settings change, regeneration implementation change, P1.1 test modification, personal-profile installation, engine-source modification, antivirus configuration or Phase 3B.3 work.

Rollback: revert only these reviewed uncommitted source changes if needed. Preserve interrupted admission locks and uncertain claims; rolling back to the previous implementation reintroduces the capacity race. Never remove historical recovery evidence merely to unblock a build.
