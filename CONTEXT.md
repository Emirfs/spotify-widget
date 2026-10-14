# spotify-widget — proje haritasi
Durum: AKTIF
Yigin: Electron (Node.js) + PowerShell izleyici. Hedef platform: Windows.
npm paketi `spotify-widget` (surum 1.0.0, MIT).

Masaustunde calan sarkiyi gosteren minimalist widget. **Spotify API anahtari
veya kullanici girisi gerektirmez**: Spotify surecinin pencere basligini okuyan
bir PowerShell izleyicisiyle calisir.

## SU AN
Canli dosya: <DOLDURULACAK>
Nerede kaldik: <DOLDURULACAK>
Siradaki: - [ ] <DOLDURULACAK>

Dal: `main`. Son commit 2026-09-03 (gitignore duzeni).

## Calistirma
| Komut | Ne yapar |
|---|---|
| `npm start` | Widget'i gelistirme modunda calistirir (`electron .`) |
| `npm run package` | Windows x64 portable exe uretir (electron-builder) |
| `npm install -g spotify-widget` | Kuresel kurulum; ardindan `spotify-widget` komutu |

## Dosyalar
| Dosya | Is |
|---|---|
| `main.js` | Electron ana surec: pencere, tepsi menusu, olcek/tema/seffaflik ayarlari, izleyici sureci |
| `renderer.js` | Widget arayuz davranisi: sarki bilgisi, sozler paneli, medya denetimleri |
| `index.html` | Widget iskeleti |
| `style.css` | Buzlu cam tasarimi, karanlik/aydinlik tema |
| `spotify-monitor.ps1` | Windows oynatma izleyicisi: Spotify surecinin pencere basligini 500 ms'de bir okur, degisince `TITLE:` satiri basar |
| `bin/cli.js` | Kuresel kurulumun komut satiri girisi |
| `icon.png` | Uygulama ve tepsi ikonu |
| `mockup-compact.svg`, `mockup-lyrics.svg` | README gorselleri |
| `AGENTS.md` / `CLAUDE.md` | Depo calisma kurallari |

## Ozellikler
Buzlu cam (glassmorphism) tasarim; fare tekerlegi veya kenardan cekmeyle
%60-%150 olcekleme; senkron veya duz metin sozler paneli; tam seffaflik modu;
sistem temasina uyan karanlik/aydinlik tema; sistem tepsisi menusu; medya
denetimleri ve ilerleme takibi.

## Bagimliliklar
- `electron` ^31 (peer + dev), `electron-builder` ^24 (paketleme).
- Calisma zamani bagimliligi yok; Node.js veya Bun kurulu olmali.
- Windows PowerShell (izleyici script'i icin).

## Dikkat
- **Izleyici pencere basligina dayanir.** Spotify kapaliyken `TITLE:OFFLINE`
  gelir; baslik bicimi degisirse ayristirma bozulur.
- PowerShell ciktisi UTF-8'e zorlanir (`[Console]::OutputEncoding`); bu satir
  kaldirilirsa ASCII disi sarki adlari bozulur.
- Paketleme hedefi yalnizca Windows x64 portable.
- `node_modules/` ve `dist/` depoya girmez.
