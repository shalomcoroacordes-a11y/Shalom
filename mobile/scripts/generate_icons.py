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


def render_ui(svg, filename, width, height):
    cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=str(assets / filename),
                     output_width=width, output_height=height)

# Recursos de Inicio. La paloma procede del MISMO contorno original
# que se utiliza en el icono oficial Android, sin emojis sustitutos.
# El mismo contorno que el icono Android: SOLO paloma con ramita.
# No agregar subrayado verde, nota musical ni trazo decorativo externo.
home_logo = f"""<svg xmlns="http://www.w3.org/2000/svg" width="650" height="390" viewBox="0 0 650 390">
  <path d="{path}" fill="white" transform="translate(-180 10) scale(.64)"/>
</svg>"""
render_ui(home_logo, "home-logo.png", 650, 390)

home_waves = """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="340" viewBox="0 0 1200 340">
<defs><linearGradient id="wave" x1="0" x2="1" y1="0" y2=".2">
<stop offset="0" stop-color="#0b6245" stop-opacity=".15"/>
<stop offset=".38" stop-color="#20c986" stop-opacity=".8"/>
<stop offset=".8" stop-color="#0e895a" stop-opacity=".68"/>
<stop offset="1" stop-color="#033c2d" stop-opacity=".1"/></linearGradient></defs>
<path d="M0 210 Q210 43 440 164 T900 156 T1200 114 L1200 208 Q948 251 778 211 T366 229 T0 282Z" fill="url(#wave)" opacity=".72"/>
<path d="M0 271 Q222 188 417 245 T843 210 T1200 232" fill="none" stroke="#21c58a" stroke-width="8" opacity=".37"/>
</svg>"""
render_ui(home_waves, "home-waves.png", 1200, 340)

home_banner = """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
<defs><linearGradient id="banner" x1="0" y1=".6" x2="1" y2="0">
<stop offset="0" stop-color="#07533e"/><stop offset=".63" stop-color="#113c37"/>
<stop offset="1" stop-color="#0b2429"/></linearGradient>
<linearGradient id="fade" x1=".5" x2="1" y1=".3" y2=".9"><stop offset="0" stop-color="#2aba8a" stop-opacity="0"/><stop offset="1" stop-color="#2aba8a" stop-opacity=".18"/></linearGradient></defs>
<rect width="1200" height="350" rx="22" fill="url(#banner)"/>
<path d="M0 315 Q210 262 416 305 T818 286 T1200 250 L1200 350 L0 350Z" fill="url(#fade)"/>
<!-- Iglesia lineal a la izquierda, realizada sin fotos externas -->
<g fill="none" stroke="#a3ffe0" stroke-width="13" stroke-linecap="round" stroke-linejoin="round">
<path d="M62 265 H258 V152 L161 76 L62 152Z"/><path d="M112 265 V204 Q112 174 151 174 Q190 174 190 204 V265"/>
<path d="M161 27 V79 M138 52 H185"/></g>
<!-- Guitarra decorativa al extremo derecho: trazo discreto para no competir con el texto -->
<g stroke="#6ed2ad" stroke-width="8" fill="none" opacity=".46" transform="rotate(24 1019 195)">
<path d="M973 5 V155 C938 139 904 161 911 197 C918 230 961 228 953 254
C945 294 976 321 1017 320 C1058 321 1089 294 1081 254
C1073 228 1116 230 1123 197 C1130 161 1096 139 1061 155 V5"/>
<ellipse cx="1017" cy="215" rx="27" ry="31"/><path d="M974 60 H1061"/>
<path d="M997 0 V350 M1011 0 V350 M1025 0 V350 M1039 0 V350" stroke-width="3"/>
</g></svg>"""
render_ui(home_banner, "home-banner.png", 1200, 350)

# Lucide SVG sources, pinned and licensed locally. Existing logo is unchanged.
import json
icons = json.loads((assets / "icons" / "catalog.json").read_text(encoding="utf-8"))
for name, svg in icons.items():
    render_ui(svg, "home-" + name + ".png", 100, 100)
