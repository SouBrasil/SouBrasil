// Captura informações do dispositivo no momento do cadastro
// IP real não é acessível no browser (limitação de segurança),
// mas capturamos via serviço público e armazenamos junto ao cadastro

export async function getDeviceInfo() {
  let ip = null;
  let country = null;
  let region = null;
  let city = null;

  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      ip = data.ip || null;
      country = data.country_name || null;
      region = data.region || null;
      city = data.city || null;
    }
  } catch {
    // silently fail
  }

  // Informações do dispositivo/navegador
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const language = navigator.language || '';
  const screenRes = `${screen.width}x${screen.height}`;
  const timezone = Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || '';

  // Geolocalização (GPS) se disponível
  let gpsLat = null;
  let gpsLng = null;
  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation?.getCurrentPosition(resolve, reject, { timeout: 4000 })
    );
    gpsLat = pos?.coords?.latitude ?? null;
    gpsLng = pos?.coords?.longitude ?? null;
  } catch {
    // GPS não disponível ou negado
  }

  return {
    reg_ip: ip,
    reg_country: country,
    reg_region: region,
    reg_city_ip: city,
    reg_user_agent: userAgent.slice(0, 300),
    reg_platform: platform,
    reg_language: language,
    reg_screen: screenRes,
    reg_timezone: timezone,
    reg_gps_lat: gpsLat,
    reg_gps_lng: gpsLng,
    reg_timestamp: new Date().toISOString(),
  };
}