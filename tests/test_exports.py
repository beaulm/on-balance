"""Exercise the export command's failure contract without installing TeX."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/export.sh"


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        for name in ("dirname", "basename", "mkdir", "mktemp", "find", "mv", "rm"):
            (self.bin / name).symlink_to(shutil.which(name))
        self.src = self.root / "source with spaces"
        (self.src / "a module").mkdir(parents=True)
        (self.src / "a module/README.md").write_text("# Example\n")
        (self.src / "second").mkdir()
        (self.src / "second/README.md").write_text("# Second\n")
        self.out = self.root / "output"
        self.out.mkdir()
        self.env = {**os.environ, "PATH": str(self.bin), "MODE": "ok"}
        self.executable("pandoc", '''#!/bin/bash
args="$*"
while [ "$#" -gt 0 ]; do
  if [ "$1" = -o ]; then shift; target=$1; fi
  shift
done
case "$MODE" in
  fail) echo partial > "$target"; exit 7 ;;
  missing) exit 0 ;;
  empty) : > "$target" ;;
  second) case "$target" in */second.*) exit 7 ;; *) echo "$args" > "$target" ;; esac ;;
  *) echo "$args" > "$target" ;;
esac
''')

    def executable(self, name, body):
        path = self.bin / name
        path.write_text(body)
        path.chmod(0o755)

    def run_export(self, *formats, success=True):
        result = subprocess.run(
            ["/bin/bash", str(SCRIPT), str(self.src), str(self.out), *formats],
            cwd=self.root, env=self.env, capture_output=True, text=True,
        )
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        self.assertFalse(list(self.out.glob(".export.*")))
        return result

    def test_epub_needs_no_tex_and_builds_every_module(self):
        self.run_export("epub")
        self.assertEqual(sorted(p.name for p in self.out.iterdir()),
                         ["a module.epub", "second.epub"])

    def test_pdf_builds_only_pdf(self):
        self.executable("xelatex", "#!/bin/bash\nexit 0\n")
        self.run_export("pdf")
        self.assertEqual(sorted(p.name for p in self.out.iterdir()),
                         ["a module.pdf", "second.pdf"])

    def test_default_builds_both(self):
        self.executable("xelatex", "#!/bin/bash\nexit 0\n")
        self.run_export()
        self.assertEqual(len(list(self.out.iterdir())), 4)

    def test_missing_tex_is_fatal(self):
        self.assertIn("No LaTeX", self.run_export("pdf", success=False).stderr)

    def test_missing_pandoc_is_fatal(self):
        (self.bin / "pandoc").unlink()
        self.assertIn("Pandoc not found", self.run_export("epub", success=False).stderr)

    def test_failed_missing_and_empty_outputs_cannot_use_stale_files(self):
        for mode in ("fail", "missing", "empty"):
            for fmt in ("pdf", "epub"):
                with self.subTest(mode=mode, format=fmt):
                    self.executable("xelatex", "#!/bin/bash\nexit 0\n")
                    stale = self.out / f"a module.{fmt}"
                    stale.write_text("old printable")
                    self.env["MODE"] = mode
                    self.run_export(fmt, success=False)
                    self.assertEqual(stale.read_text(), "old printable")

    def test_failure_in_another_module_is_fatal(self):
        self.env["MODE"] = "second"
        self.run_export("epub", success=False)

    def test_empty_and_missing_sources_are_fatal(self):
        for p in self.src.glob("*/README.md"):
            p.unlink()
        res = self.run_export("epub", success=False)
        self.assertIn("No module README.md files found", res.stderr)
        self.src = self.root / "missing"
        res2 = self.run_export("epub", success=False)
        self.assertIn("Source directory not found", res2.stderr)

    def test_engine_passed_only_for_pdf(self):
        self.executable("xelatex", "#!/bin/bash\nexit 0\n")
        self.run_export()
        pdf_text = (self.out / "a module.pdf").read_text()
        epub_text = (self.out / "a module.epub").read_text()
        self.assertIn("--pdf-engine=xelatex", pdf_text)
        self.assertNotIn("--pdf-engine", epub_text)

    def test_nested_subfolder_readmes_are_ignored(self):
        nested = self.src / "a module/sub"
        nested.mkdir()
        (nested / "README.md").write_text("# Nested\n")
        self.run_export("epub")
        self.assertEqual(sorted(p.name for p in self.out.iterdir()),
                         ["a module.epub", "second.epub"])

    def test_unknown_format_is_fatal(self):
        self.run_export("html", success=False)
