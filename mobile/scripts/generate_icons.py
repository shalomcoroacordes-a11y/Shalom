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
 "search": '<circle cx="34" cy="33" r="20"/><path d="M48 48L69 69"/>'
}
for name, drawing in icons.items():
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    <g fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">{drawing}</g></svg>"""
    render_ui(svg, "home-" + name + ".png", 100, 100)

# Social marks: local, transparent and monochrome. The public profile tints
# these assets with the existing muted/active palette; no remote icon requests.
social_icons = {
    "facebook": '<path fill="white" d="M14 22V13h3l.5-3H14V8.2c0-.9.3-1.5 1.6-1.5H18V4a17 17 0 0 0-2.6-.2C12.8 3.8 11 5.4 11 8.4V10H8v3h3v9Z"/>',
    "tiktok": '<path fill="white" d="M14 2h3c.3 2.7 1.9 4.4 5 4.8V10a8.2 8.2 0 0 1-5-1.7v7.8A6 6 0 1 1 11 10v3.2a2.9 2.9 0 1 0 3 2.9Z"/>',
    "instagram": '<g stroke="white" stroke-width="1.9" fill="none"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></g><circle cx="17.4" cy="6.7" r="1.1" fill="white"/>',
    "youtube": '<path fill="white" fill-rule="evenodd" d="M22 7.1c-.2-1.5-1.3-2.5-2.8-2.7A64 64 0 0 0 12 4a64 64 0 0 0-7.2.4C3.3 4.6 2.2 5.6 2 7.1a35 35 0 0 0 0 9.8c.2 1.5 1.3 2.5 2.8 2.7a64 64 0 0 0 14.4 0c1.5-.2 2.6-1.2 2.8-2.7a35 35 0 0 0 0-9.8ZM10 8.5v7l6-3.5Z"/>',
    "spotify": '<path fill="white" fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM6.2 8.1c4.3-1.4 9.1-.9 12.4 1.3a.9.9 0 0 1-1 1.5C14.5 9 10.3 8.6 6.8 9.8a.9.9 0 1 1-.6-1.7Zm.9 3.4c3.5-1 7.3-.6 10.2 1a.75.75 0 1 1-.8 1.3c-2.5-1.4-5.9-1.7-9-.9a.75.75 0 0 1-.4-1.4Zm.8 3.2c2.8-.8 5.7-.5 8 1a.6.6 0 0 1-.6 1c-2.1-1.3-4.6-1.5-7.1-.8a.6.6 0 0 1-.3-1.2Z"/>'
}
for name, drawing in social_icons.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">{drawing}</svg>'
    render_ui(svg, "social-" + name + ".png", 96, 96)
