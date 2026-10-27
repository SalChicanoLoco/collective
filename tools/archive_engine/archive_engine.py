#!/usr/bin/env python3
"""
Sena Colectivo — Green Tech & Academic Archival Engine
Handles BibTeX ingestion, LaTeX compilation, and web publication generation.
"""

import os
import sys
import shutil
import subprocess
import argparse
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

TEXBIN = "/Library/TeX/texbin"

def ensure_tex_path():
    path = os.environ.get("PATH", "")
    if TEXBIN not in path:
        os.environ["PATH"] = f"{TEXBIN}:{path}"

class LaTeXBibTeXBuilder:
    def __init__(self, compiler: str = "pdflatex"):
        self.compiler = compiler
        ensure_tex_path()

    def compile(self, tex_file: Path, output_pdf: Optional[Path] = None, clean_aux: bool = True) -> Tuple[bool, str]:
        tex_path = Path(tex_file).resolve()
        if not tex_path.exists():
            return False, f"File not found: {tex_path}"

        work_dir = tex_path.parent
        stem = tex_path.stem
        target_pdf = output_pdf.resolve() if output_pdf else work_dir / f"{stem}.pdf"

        # Pass 1: pdflatex
        cmd_latex = [self.compiler, "-interaction=nonstopmode", "-halt-on-error", f"-output-directory={work_dir}", str(tex_path)]
        res1 = subprocess.run(cmd_latex, cwd=str(work_dir), capture_output=True, text=True)
        if res1.returncode != 0:
            return False, f"LaTeX Pass 1 Error:\n{res1.stdout[-800:]}"

        # Pass 2: bibtex (if aux contains bibdata)
        aux_path = work_dir / f"{stem}.aux"
        if aux_path.exists() and "bibdata" in aux_path.read_text(errors="ignore"):
            res_bib = subprocess.run(["bibtex", stem], cwd=str(work_dir), capture_output=True, text=True)
            # Pass 3 & 4: pdflatex to resolve references and citations
            subprocess.run(cmd_latex, cwd=str(work_dir), capture_output=True, text=True)
            res_final = subprocess.run(cmd_latex, cwd=str(work_dir), capture_output=True, text=True)
            if res_final.returncode != 0:
                return False, f"LaTeX Final Pass Error:\n{res_final.stdout[-800:]}"

        compiled_pdf = work_dir / f"{stem}.pdf"
        if compiled_pdf.exists() and compiled_pdf != target_pdf:
            shutil.copy2(compiled_pdf, target_pdf)

        if clean_aux:
            for ext in [".aux", ".bbl", ".blg", ".log", ".out", ".toc", ".nav", ".snm", ".vrb"]:
                f = work_dir / f"{stem}{ext}"
                if f.exists():
                    try:
                        f.unlink()
                    except Exception:
                        pass

        if target_pdf.exists():
            return True, f"Successfully built PDF: {target_pdf}"
        return False, "PDF was not created."

def list_bib_entries(bib_path: Path):
    if not bib_path.exists():
        print(f"BibTeX file not found: {bib_path}")
        return
    content = bib_path.read_text(encoding="utf-8")
    import re
    entries = re.findall(r"@(\w+)\s*\{\s*([^,]+),", content)
    print(f"\n📚 Master BibTeX Archive: {bib_path} ({len(entries)} entries)\n" + "=" * 60)
    for entry_type, key in entries:
        print(f" • [{entry_type.upper():<10}] {key}")
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description="Colectivo Green Tech Archival & LaTeX/BibTeX Engine")
    parser.add_argument("--list", action="store_true", help="List all BibTeX entries in the archive")
    parser.add_argument("--compile", metavar="TEX_FILE", help="Compile a LaTeX+BibTeX document to PDF")
    parser.add_argument("-o", "--output", help="Output PDF path")
    parser.add_argument("--bib", default="archive/green_tech.bib", help="Path to master bib file")

    args = parser.parse_args()
    base_dir = Path(__file__).resolve().parents[2]
    bib_file = (base_dir / args.bib).resolve()

    if args.list:
        list_bib_entries(bib_file)
        return

    if args.compile:
        tex_path = Path(args.compile).resolve()
        out_path = Path(args.output).resolve() if args.output else None
        builder = LaTeXBibTeXBuilder()
        print(f"🚀 Compiling LaTeX+BibTeX document: {tex_path}...")
        success, msg = builder.compile(tex_path, output_pdf=out_path)
        if success:
            print(f"✅ {msg}")
        else:
            print(f"❌ {msg}")
            sys.exit(1)
        return

    parser.print_help()

if __name__ == "__main__":
    main()
