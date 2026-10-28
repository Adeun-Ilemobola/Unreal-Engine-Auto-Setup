"""Disposable preflight fixtures; do not invoke build_bundle or create installers."""
import json
from pathlib import Path
import tempfile
import unittest

from bundle_sources import ASSETS, DOCUMENTS, package_files, validate


class PackagingInputs(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="unreal-package-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "unreal-auto-setup"
        self.source.mkdir()
        for name in ASSETS:
            file = self.source / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text("fixture", encoding="utf-8")
        (self.source / "package.json").write_text(json.dumps({"main": "./extension.js"}), encoding="utf-8")
        (self.source / "extension.js").write_text("require('./workflow');", encoding="utf-8")
        (self.source / "workflow.js").write_text("module.exports = {};", encoding="utf-8")
        for name in DOCUMENTS:
            (self.root / name).write_bytes((self.source / name).read_bytes())

    def test_new_runtime_modules_are_included_without_test_files(self):
        (self.source / "newService.js").write_text("module.exports = {};", encoding="utf-8")
        (self.source / "tests").mkdir()
        (self.source / "tests" / "service.test.js").write_text("test fixture", encoding="utf-8")
        files = validate(self.root)
        self.assertIn(self.source / "newService.js", files)
        self.assertFalse(any("tests" in file.parts for file in files))
        self.assertEqual(files, package_files(self.root))

    def test_missing_local_import_blocks_preflight(self):
        (self.source / "workflow.js").unlink()
        with self.assertRaisesRegex(ValueError, "Unpackaged local import"):
            validate(self.root)

    def test_document_drift_blocks_preflight(self):
        (self.root / "README.md").write_text("outdated", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Documentation copies differ"):
            validate(self.root)

    def test_unlisted_entry_point_blocks_preflight(self):
        (self.source / "package.json").write_text(json.dumps({"main": "./nested/start.js"}), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Entry point is not packaged"):
            validate(self.root)


if __name__ == "__main__":
    unittest.main()
