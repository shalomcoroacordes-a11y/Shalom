import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("check_clean_changes", pathlib.Path(__file__).resolve().parents[1] / "scripts/check_clean_changes.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class NamingPolicy(unittest.TestCase):
    def test_rejects_new_patch_names(self):
        for name in ["home-fix.js", "admin-patch2.css", "mobile/src/reader-v2.js", "studio/hotfix.ts", "admin-visual-polish.css"]:
            with self.subTest(name=name):
                self.assertTrue(module.is_patch_path(name))
    def test_allows_functional_and_test_names(self):
        for name in ["home.js", "mobile/src/song-reader.js", "tests/reader-fix-regression.cjs", "docs/plan-v2.md", "mobile/src/fixed-layout.js", "database/migrations/20261124_patch.sql"]:
            with self.subTest(name=name):
                self.assertFalse(module.is_patch_path(name))

if __name__ == "__main__":
    unittest.main()
