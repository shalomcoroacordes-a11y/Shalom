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

# Iconos monocromos transparentes: tintColor en React Native puede resaltar el activo.
icons = {
 "song": '<path d="M29 19V63a11 11 0 1 1-7-10V28l33-9v33a11 11 0 1 1-7-10V10Z"/>',
 "repertoires": '<path d="M15 27 40 12 65 27 40 42Z M15 39 40 54 65 39 M15 51 40 66 65 51"/>',
 "artists": '<circle cx="40" cy="23" r="10"/><path d="M21 64v-9c0-17 38-17 38 0v9 M17 33c-14 2-14 18-11 25 M63 33c14 2 14 18 11 25"/>',
 "categories": '<path d="M11 22V15q0-5 5-5h19l9 10h20q5 0 5 5v39q0 5-5 5H16q-5 0-5-5Z"/>',
 "medleys": '<path d="M12 22H46 M12 37H38 M12 52H31 M55 20V56a10 10 0 1 1-7-10V14l21-6v33a10 10 0 1 1-7-10"/>',
 "albums": '<rect x="12" y="16" width="56" height="48" rx="7"/><path d="m33 29 19 11-19 11Z"/>',
 "home": '<path d="M8 36 40 11 72 36 M17 34V68h46V34 M34 68V48h13v20"/>',
 "more": '<circle cx="17" cy="40" r="3"/><circle cx="40" cy="40" r="3"/><circle cx="63" cy="40" r="3"/>',
 "bell": '<path d="M21 59h38l-8-11V31c0-14-22-18-22 0v17Z M34 66q6 10 13 0"/>',
 "menu": '<path d="M10 22h60 M10 40h60 M10 58h60"/>',
 "church": '<path d="M9 65h62 M16 65V34L40 13l24 21v31 M33 65V48q7-9 14 0v17 M40 3v13 M32 9h16"/>',
 "mass": '<path d="M12 17 H68 L61 35 Q56 48 40 48 Q24 48 19 35 Z M40 48V66 M22 68H58 M40 3V19 M31 11H49"/>',
 "calendar": '<rect x="10" y="18" width="60" height="54" rx="7"/><path d="M10 33H70 M26 8V26 M54 8V26 M40 43L44 51L54 52L47 59L49 68L40 64L31 68L33 59L26 52L36 51Z"/>',
 "search": '<circle cx="34" cy="33" r="20"/><path d="M48 48L69 69"/>',
 "heart": '<path d="M40 65 13 39C-1 23 20 7 34 22l6 7 6-7C60 7 81 23 67 39Z"/>',
 "guitar": '<path d="m44 35 21-22 9 9-22 22M42 33c-7-5-16-2-18 6-1 4-7 5-11 8-11 8-8 24 4 27 13 4 25-4 25-15 0-5 5-7 10-10 5-4 5-11-1-15"/><circle cx="30" cy="52" r="5"/><path d="m62 10 9-7 7 7-5 10"/>',
 "share": '<circle cx="62" cy="14" r="9"/><circle cx="18" cy="40" r="9"/><circle cx="62" cy="66" r="9"/><path d="m26 35 28-16M26 45l28 16"/>',
 "link": '<path d="M33 50 47 36M29 35 16 48a13 13 0 0 0 18 18l13-13M51 45l13-13a13 13 0 0 0-18-18L33 27"/>',
 "print": '<rect x="19" y="7" width="42" height="23" rx="2"/><path d="M18 57H8V31q0-6 6-6h52q6 0 6 6v26H62M57 38h4"/><rect x="19" y="47" width="42" height="25" rx="2"/>',
 "download": '<path d="M40 8v43M24 35l16 16 16-16M10 54v14h60V54"/>',
 "fullscreen": '<path d="M9 29V9h20M51 9h20v20M71 51v20H51M29 71H9V51"/>',
 "reset": '<path d="M13 34a28 28 0 1 1 5 26M13 12v22h22"/>',
 "edit": '<path d="m12 53 38-38 15 15-38 38-17 3ZM45 20l15 15M56 9l7-5 13 13-5 7"/>',
 "backup": '<path d="M40 52V10M24 26l16-16 16 16M10 53v16h60V53"/>',
 "external": '<path d="M44 12h24v24M68 12 33 47M38 13H12v55h55V42"/>'
}
for name, drawing in icons.items():
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    <g fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">{drawing}</g></svg>"""
    render_ui(svg, "home-" + name + ".png", 100, 100)

# Social marks: local, transparent and monochrome. The public profile tints
# these assets with the existing muted/active palette; no remote icon requests.
for name in ("facebook", "tiktok", "instagram", "youtube", "spotify"):
    svg = (root.parent / "social-icons" / (name + ".svg")).read_text(encoding="utf-8")
    render_ui(svg, "social-" + name + ".png", 96, 96)
