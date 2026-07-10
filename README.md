# Spotify Widget

Masaüstünüzde çalan şarkıyı gösteren, Windows ve Spotify ile tam senkronize çalışan, modern ve minimalist bir Electron widget'ı. Herhangi bir Spotify API anahtarı veya kullanıcı girişi gerektirmeden çalışır.

---

## Görsel Önizleme

### 1. Kompakt Mod (Karanlık Tema)

<svg width="400" height="150" viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
  <!-- Arka plan kartı (Mockup alanı) -->
  <rect width="400" height="150" rx="12" fill="#141414" stroke="#222222" stroke-width="1" />
  
  <!-- Pencere Kontrolleri -->
  <circle cx="20" cy="20" r="4" fill="#ff5f56" />
  <circle cx="30" cy="20" r="4" fill="#ffbd2e" />
  <circle cx="40" cy="20" r="4" fill="#27c93f" />
  
  <!-- Widget Konteyneri (Glassmorphism efekti simülasyonu) -->
  <rect x="37" y="35" width="326" height="80" rx="16" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
  <rect x="38" y="36" width="324" height="78" rx="15" fill="none" stroke="rgba(29, 185, 84, 0.15)" stroke-width="1" />
  
  <!-- Albüm Görseli (Placeholder) -->
  <rect x="53" y="47" width="56" height="56" rx="8" fill="url(#albumGrad)" />
  <circle cx="81" cy="75" r="8" fill="#141414" opacity="0.8" />
  <circle cx="81" cy="75" r="3" fill="#1DB954" />
  
  <!-- Şarkı Bilgileri -->
  <text x="120" y="68" font-family="'Inter', sans-serif" font-size="13" font-weight="600" fill="#FFFFFF">Angie</text>
  <text x="120" y="85" font-family="'Inter', sans-serif" font-size="11" font-weight="500" fill="rgba(255, 255, 255, 0.5)">The Rolling Stones</text>
  
  <!-- Medya Kontrolleri -->
  <!-- Önceki Şarkı -->
  <path d="M255 70 L255 80 L248 75 Z" fill="rgba(255,255,255,0.6)" />
  <rect x="246" y="70" width="2" height="10" fill="rgba(255,255,255,0.6)" rx="0.5" />
  
  <!-- Oynat/Durdur (Durdurulmuş - Pause İkonu Yuvarlak Butonda) -->
  <circle cx="280" cy="75" r="14" fill="#1DB954" />
  <rect x="275" y="70" width="3" height="10" fill="#FFFFFF" rx="1" />
  <rect x="282" y="70" width="3" height="10" fill="#FFFFFF" rx="1" />
  
  <!-- Sonraki Şarkı -->
  <path d="M305 70 L305 80 L312 75 Z" fill="rgba(255,255,255,0.6)" />
  <rect x="312" y="70" width="2" height="10" fill="rgba(255,255,255,0.6)" rx="0.5" />
  
  <!-- İlerleme Çubuğu (Alttaki ince yeşil çizgi) -->
  <rect x="53" y="108" width="294" height="2" rx="1" fill="rgba(255, 255, 255, 0.1)" />
  <rect x="53" y="108" width="120" height="2" rx="1" fill="#1DB954" />
  
  <!-- Zaman Göstergesi -->
  <text x="312" y="102" font-family="'Inter', sans-serif" font-size="8" fill="rgba(255, 255, 255, 0.4)">1:42 / 4:33</text>
  
  <!-- Ekstra Butonlar (Şeffaflık, Tema, Sözler) -->
  <circle cx="342" cy="52" r="3" fill="rgba(255,255,255,0.3)" />
  <circle cx="342" cy="62" r="3" fill="rgba(255,255,255,0.3)" />
  <circle cx="342" cy="72" r="3" fill="rgba(255,255,255,0.3)" />

  <defs>
    <linearGradient id="albumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2b2b2b" />
      <stop offset="100%" stop-color="#141414" />
    </linearGradient>
  </defs>
</svg>

### 2. Genişletilmiş Söz Paneli Modu

<svg width="400" height="340" viewBox="0 0 400 340" xmlns="http://www.w3.org/2000/svg">
  <!-- Arka plan kartı -->
  <rect width="400" height="340" rx="12" fill="#141414" stroke="#222222" stroke-width="1" />
  
  <!-- Pencere Kontrolleri -->
  <circle cx="20" cy="20" r="4" fill="#ff5f56" />
  <circle cx="30" cy="20" r="4" fill="#ffbd2e" />
  <circle cx="40" cy="20" r="4" fill="#27c93f" />
  
  <!-- Şarkı Sözleri Paneli -->
  <rect x="37" y="35" width="326" height="180" rx="16" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" />
  
  <!-- Şarkı Sözleri Başlık ve İçerik -->
  <text x="53" y="60" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#1DB954">Lyrics</text>
  <text x="53" y="90" font-family="'Inter', sans-serif" font-size="12" fill="rgba(255,255,255,0.3)">Angie, Angie</text>
  <text x="53" y="115" font-family="'Inter', sans-serif" font-size="12" fill="rgba(255,255,255,0.3)">When will those dark clouds disappear?</text>
  <text x="53" y="140" font-family="'Inter', sans-serif" font-size="13" font-weight="600" fill="#FFFFFF">Angie, Angie</text>
  <text x="53" y="165" font-family="'Inter', sans-serif" font-size="12" fill="rgba(255,255,255,0.3)">Where will it lead us from here?</text>
  <text x="53" y="190" font-family="'Inter', sans-serif" font-size="12" fill="rgba(255,255,255,0.3)">With no loving in our souls</text>

  <!-- Kaydırma Çubuğu İndikatörü -->
  <rect x="352" y="70" width="3" height="100" rx="1.5" fill="rgba(255,255,255,0.05)" />
  <rect x="352" y="110" width="3" height="30" rx="1.5" fill="rgba(255,255,255,0.2)" />
  
  <!-- Widget Konteyneri -->
  <rect x="37" y="225" width="326" height="80" rx="16" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
  
  <!-- Albüm Görseli -->
  <rect x="53" y="237" width="56" height="56" rx="8" fill="url(#albumGrad2)" />
  <circle cx="81" cy="265" r="8" fill="#141414" opacity="0.8" />
  <circle cx="81" cy="265" r="3" fill="#1DB954" />
  
  <!-- Şarkı Bilgileri -->
  <text x="120" y="258" font-family="'Inter', sans-serif" font-size="13" font-weight="600" fill="#FFFFFF">Angie</text>
  <text x="120" y="275" font-family="'Inter', sans-serif" font-size="11" font-weight="500" fill="rgba(255, 255, 255, 0.5)">The Rolling Stones</text>
  
  <!-- Kontroller -->
  <path d="M255 260 L255 270 L248 265 Z" fill="rgba(255,255,255,0.6)" />
  <rect x="246" y="260" width="2" height="10" fill="rgba(255,255,255,0.6)" rx="0.5" />
  
  <circle cx="280" cy="265" r="14" fill="#1DB954" />
  <rect x="275" y="260" width="3" height="10" fill="#FFFFFF" rx="1" />
  <rect x="282" y="260" width="3" height="10" fill="#FFFFFF" rx="1" />
  
  <path d="M305 260 L305 270 L312 265 Z" fill="rgba(255,255,255,0.6)" />
  <rect x="312" y="260" width="2" height="10" fill="rgba(255,255,255,0.6)" rx="0.5" />
  
  <!-- İlerleme Çubuğu -->
  <rect x="53" y="298" width="294" height="2" rx="1" fill="rgba(255, 255, 255, 0.1)" />
  <rect x="53" y="298" width="150" height="2" rx="1" fill="#1DB954" />
  
  <!-- Zaman Göstergesi -->
  <text x="312" y="292" font-family="'Inter', sans-serif" font-size="8" fill="rgba(255, 255, 255, 0.4)">2:15 / 4:33</text>

  <defs>
    <linearGradient id="albumGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2b2b2b" />
      <stop offset="100%" stop-color="#141414" />
    </linearGradient>
  </defs>
</svg>

---

## Özellikler

* **Buzlu Cam (Glassmorphism) Tasarımı**: Arka plan bulanıklığı ve yarı şeffaflık ile masaüstünüzle bütünleşen arayüz.
* **Dinamik Boyutlandırma ve Ölçekleme**: Arayüzü fare tekerleğiyle veya kenarlarından çekerek %60 ile %150 arasında ölçeklendirebilme.
* **Dinamik Söz (Lyrics) Paneli**: Şarkıyla senkronize kayan sözleri veya düz metin sözlerini görüntüleme paneli.
* **Tam Şeffaflık Modu**: Widget arka planını ve çerçevesini tamamen gizleyerek sadece albüm kapağını, şarkı adını ve kontrolleri masaüstünde yüzer halde bırakma seçeneği.
* **Tema Desteği**: Sistem tercihlerine veya manuel seçime göre anında değişebilen Karanlık ve Aydınlık tema yapıları.
* **Sistem Tepsisi (Tray) Entegrasyonu**: Windows görev çubuğu sağ tık menüsünden ölçek, tema, sözler ve şeffaflık ayarlarını yönetebilme.
* **Medya Denetimleri**: Önceki, Oynat/Durdur ve Sonraki şarkı butonları ile aktif ilerleme takibi ve zaman göstergesi.
* **Sıfır API Entegrasyonu**: Spotify geliştirici hesabı veya kullanıcı girişi gerektirmez. Windows üzerinden çalışan güvenli ve hafif bir arka plan izleyicisi kullanır.

---

## Çalıştırma ve Kurulum

### Gereksinimler

Projenin çalıştırılması için bilgisayarınızda **Node.js** veya **Bun** kurulu olmalıdır.

### Adımlar

1. Proje dizinine gidin:
   ```bash
   cd C:\Users\emir.sari\Desktop\spotify-widget
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Uygulamayı geliştirici modunda başlatın:
   ```bash
   npm start
   ```

---

## Taşınabilir (.exe) Dosya Oluşturma

Projeyi tek bir çalıştırılabilir dosya haline getirmek ve kurulum gerektirmeden kullanabilmek için aşağıdaki komutu çalıştırabilirsiniz:

```bash
npm run package
```

Bu işlem tamamlandığında paketlenmiş sürüm şu konumda oluşturulacaktır:
`C:\Users\emir.sari\Desktop\spotify-widget\dist\SpotifyWidget 1.0.0.exe`

---

## Teknik Ayrıntılar

* **Hafif İzleyici Metodu**: Uygulama, arkaplanda `Spotify` işlem başlığını (`MainWindowTitle`) inceleyen ve UTF-8 çıkış üreten hafif bir PowerShell betiği çalıştırır. Bu sayede Spotify API sınırlarına takılmaz ve ağ trafiği harcamaz.
* **ASAR Uyumluluğu**: Paketlenen uygulamada PowerShell betiğinin sanal arşiv dosyaları nedeniyle çökmemesi için betik, uygulamanın çalışması esnasında geçici sistem dizinine (`%TEMP%`) çıkarılarak güvenli bir şekilde tetiklenir.
* **Hafif Bellek Tüketimi**: Arka plan izleyicisi 500ms aralıklarla minimum sistem kaynağı tüketecek şekilde optimize edilmiştir.
