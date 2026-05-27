import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// WMO weather interpretation codes → label + emoji
// ---------------------------------------------------------------------------

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Clear sky',      emoji: '☀️'  },
  1:  { label: 'Mainly clear',   emoji: '🌤️'  },
  2:  { label: 'Partly cloudy',  emoji: '⛅'  },
  3:  { label: 'Overcast',       emoji: '☁️'  },
  45: { label: 'Fog',            emoji: '🌫️'  },
  48: { label: 'Icy fog',        emoji: '🌫️'  },
  51: { label: 'Light drizzle',  emoji: '🌦️'  },
  53: { label: 'Drizzle',        emoji: '🌦️'  },
  55: { label: 'Heavy drizzle',  emoji: '🌧️'  },
  61: { label: 'Light rain',     emoji: '🌧️'  },
  63: { label: 'Rain',           emoji: '🌧️'  },
  65: { label: 'Heavy rain',     emoji: '🌧️'  },
  71: { label: 'Light snow',     emoji: '🌨️'  },
  73: { label: 'Snow',           emoji: '❄️'  },
  75: { label: 'Heavy snow',     emoji: '❄️'  },
  77: { label: 'Snow grains',    emoji: '❄️'  },
  80: { label: 'Rain showers',   emoji: '🌦️'  },
  81: { label: 'Showers',        emoji: '🌧️'  },
  82: { label: 'Heavy showers',  emoji: '⛈️'  },
  85: { label: 'Snow showers',   emoji: '🌨️'  },
  86: { label: 'Heavy snow',     emoji: '❄️'  },
  95: { label: 'Thunderstorm',   emoji: '⛈️'  },
  96: { label: 'Thunderstorm',   emoji: '⛈️'  },
  99: { label: 'Thunderstorm',   emoji: '⛈️'  },
}

function wmo(code: number) {
  return WMO[code] ?? { label: 'Unknown', emoji: '🌡️' }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CurrentWeather {
  temp: number       // Celsius from API
  feelsLike: number
  code: number
  windMph: number
  humidity: number
}

interface DayForecast {
  date: string       // YYYY-MM-DD
  max: number
  min: number
  code: number
  precipProb: number
}

type Status = 'idle' | 'locating' | 'loading' | 'ok' | 'error'

interface WeatherState {
  status: Status
  location?: { city: string; region: string }
  current?: CurrentWeather
  daily?: DayForecast[]
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cToF = (c: number) => Math.round(c * 9 / 5 + 32)

function fmt(c: number, unit: 'F' | 'C') {
  return unit === 'F' ? `${cToF(c)}°` : `${Math.round(c)}°`
}

function dayLabel(dateStr: string, index: number) {
  if (index === 0) return 'Today'
  // Use noon local time to avoid DST date shifts
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WeatherWidget() {
  const [state, setState] = useState<WeatherState>({ status: 'idle' })
  const [unit, setUnit] = useState<'F' | 'C'>('F')

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setState(s => ({ ...s, status: 'loading' }))
    try {
      const [weatherRes, geoRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
          `&wind_speed_unit=mph&timezone=auto&forecast_days=5`
        ),
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        ),
      ])

      if (!weatherRes.ok) throw new Error('Weather API error')

      const [weather, geo] = await Promise.all([weatherRes.json(), geoRes.json()])

      const addr = geo.address ?? {}
      const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? 'Unknown'
      const region = (addr.state_code ?? addr.country_code ?? '').toUpperCase()

      setState({
        status: 'ok',
        location: { city, region },
        current: {
          temp:      weather.current.temperature_2m,
          feelsLike: weather.current.apparent_temperature,
          code:      weather.current.weather_code,
          windMph:   Math.round(weather.current.wind_speed_10m),
          humidity:  Math.round(weather.current.relative_humidity_2m),
        },
        daily: (weather.daily.time as string[]).map((date, i) => ({
          date,
          max:        weather.daily.temperature_2m_max[i],
          min:        weather.daily.temperature_2m_min[i],
          code:       weather.daily.weather_code[i],
          precipProb: weather.daily.precipitation_probability_max[i] ?? 0,
        })),
      })
    } catch {
      setState({ status: 'error', error: 'Could not load weather data' })
    }
  }, [])

  const load = useCallback(() => {
    setState({ status: 'locating' })

    // Try the browser Geolocation API first (granted by the Electron
    // permission handler in main). Fall back to IP-based location if it
    // fails or is unavailable.
    // Try IP-based geolocation services in order until one works
    const tryIpFallback = async () => {
      const services = [
        async () => {
          const d = await fetch('https://ipwho.is/').then(r => r.json())
          if (d.success && d.latitude && d.longitude) return { lat: d.latitude, lon: d.longitude }
          return null
        },
        async () => {
          const d = await fetch('https://freeipapi.com/api/json').then(r => r.json())
          if (d.latitude && d.longitude) return { lat: d.latitude, lon: d.longitude }
          return null
        },
        async () => {
          const d = await fetch('https://ipapi.co/json/').then(r => r.json())
          if (d.latitude && d.longitude) return { lat: d.latitude, lon: d.longitude }
          return null
        },
      ]

      for (const svc of services) {
        try {
          const coords = await svc()
          if (coords) { await fetchWeather(coords.lat, coords.lon); return }
        } catch { /* try next */ }
      }
      setState({ status: 'error', error: 'Could not determine location' })
    }

    if (!navigator.geolocation) {
      tryIpFallback()
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lon } }) => fetchWeather(lat, lon),
      () => tryIpFallback(),
      { timeout: 10000 }
    )
  }, [fetchWeather])

  useEffect(() => { load() }, [load])

  // ---- Loading ----
  if (state.status !== 'ok' && state.status !== 'error') {
    return (
      <div className="wx wx--center">
        <div className="wx-spinner" />
        <span className="wx-muted">
          {state.status === 'locating' ? 'Getting location…' : 'Loading weather…'}
        </span>
      </div>
    )
  }

  // ---- Error ----
  if (state.status === 'error') {
    return (
      <div className="wx wx--center">
        <span style={{ fontSize: 28 }}>⚠️</span>
        <span className="wx-muted">{state.error}</span>
        <button className="wx-retry" onClick={load}>Retry</button>
      </div>
    )
  }

  const { location, current, daily } = state
  const info = wmo(current!.code)

  // ---- Data ----
  return (
    <div className="wx">
      {/* ── Header ── */}
      <div className="wx-header">
        <div className="wx-location">
          <span className="wx-city">{location!.city}</span>
          {location!.region && (
            <span className="wx-region">,&thinsp;{location!.region}</span>
          )}
        </div>
        <div className="wx-controls">
          <button
            className={`wx-unit${unit === 'F' ? ' wx-unit--on' : ''}`}
            onClick={() => setUnit('F')}
          >°F</button>
          <span className="wx-sep">/</span>
          <button
            className={`wx-unit${unit === 'C' ? ' wx-unit--on' : ''}`}
            onClick={() => setUnit('C')}
          >°C</button>
          <button className="wx-refresh" onClick={load} title="Refresh">↻</button>
        </div>
      </div>

      {/* ── Current ── */}
      <div className="wx-current">
        <div className="wx-emoji">{info.emoji}</div>
        <div className="wx-temp">{fmt(current!.temp, unit)}</div>
        <div className="wx-condition">{info.label}</div>
        <div className="wx-meta">
          <span>Feels like {fmt(current!.feelsLike, unit)}</span>
          <span className="wx-dot">·</span>
          <span>{current!.windMph} mph</span>
          <span className="wx-dot">·</span>
          <span>{current!.humidity}%</span>
        </div>
      </div>

      {/* ── 5-day forecast ── */}
      <div className="wx-forecast">
        {daily!.map((day, i) => {
          const d = wmo(day.code)
          return (
            <div key={day.date} className="wx-day">
              <span className="wx-day-label">{dayLabel(day.date, i)}</span>
              <span className="wx-day-emoji">{d.emoji}</span>
              <span className="wx-day-hi">{fmt(day.max, unit)}</span>
              <span className="wx-day-lo">{fmt(day.min, unit)}</span>
              {day.precipProb >= 20 && (
                <span className="wx-day-precip">💧{day.precipProb}%</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
