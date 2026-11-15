"""Construye los iconos nativos desde la silueta exacta de la paloma aportada por el coro.
El archivo original adjunto no se publica; solo se conserva su contorno vectorial."""
from pathlib import Path
import re
import cairosvg

root = Path(__file__).resolve().parents[1]
assets = root / "assets"
path = (assets / "dove-path.txt").read_text(encoding="utf-8").strip()
if not path.startswith("M ") or len(re.findall(r"\d+,\d+", path)) < 80:
    raise RuntimeError("No se encontró el contorno completo de la paloma SHALOM.")

def render(svg, filename):
    cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=str(assets / filename),
                     output_width=1024, output_height=1024)

# Icono cuadrado, Android le aplica su máscara redonda o redondeada según dispositivo.
icon = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#087947"/>
<stop offset=".47" stop-color="#006D3B"/><stop offset="1" stop-color="#004C2C"/></linearGradient></defs>
<rect width="1024" height="1024" fill="url(#g)"/>
<path d="{path}" fill="white" transform="translate(-321.85 219.26) scale(1.02)"/></svg>"""
# El adaptativo debe quedar dentro de la zona segura para máscaras circulares.
adaptive = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<path d="{path}" fill="white" transform="translate(-158.35 276.66) scale(.82)"/></svg>"""

render(icon, "icon.png")
render(adaptive, "adaptive-foreground.png")
print("SHALOM: icono Android creado con la paloma original.")
