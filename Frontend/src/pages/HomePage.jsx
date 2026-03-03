import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RoleNav from '../components/RoleNav'
import AssistantHub from '../components/AssistantHub'
import { API_BASE, apiRequest } from '../lib/api'
import unifiedImage from '../assets/unified_image.png'
import heroSection from '../assets/herosection.png'

const services = [
  {
    title: 'Request NGO Direct',
    description: 'You can request help from NGO',
    icon: 'Request',
  },
  {
    title: 'Resource Coordination',
    description: 'Match needs with NGO and donor resources quickly.',
    icon: 'RES',
  },
  {
    title: 'Emergency Alerts',
    description: 'Broadcast verified alerts to all stakeholders.',
    icon: 'ALT',
  },
  {
    title: 'Ai/Voice Assist',
    description: 'Ai and Voice assistant support',
    icon: 'Ai',
  },
  {
    title: 'Missing Person',
    description: 'we can report/find missing person',
    icon: 'MP',
  },
  {
    title: 'Shelters',
    description: 'Smart Shelter availability indicator',
    icon: 'Shelter',
  },
  {
    title: 'Compensation',
    description: 'Compensation End-to-End encrypted',
    icon: 'Compensation',
  },
  {
    title: 'Payments',
    description: 'Smart payments done by our portal',
    icon: 'Pay',
  }
]

const DEFAULT_HERO = {
  alert_text: 'ALERT: Heavy rainfall warning in coastal regions. Evacuation advised in low-lying areas.',
  hero_text: 'Alert: Stay safe during the next weather event.',
  image_path: heroSection,
}

export default function HomePage() {
  const [homeSettings, setHomeSettings] = useState(DEFAULT_HERO)

  useEffect(() => {
    let mounted = true
    apiRequest('/v1/home-settings')
      .then((data) => {
        if (!mounted) return
        const normalized = { ...data, image_path: heroSection }
        setHomeSettings((prev) => ({ ...prev, ...normalized }))
      })
      .catch(() => {
        // keep defaults on failure
      })
    return () => { mounted = false }
  }, [])

  const heroImageUrl = homeSettings.image_path || DEFAULT_HERO.image_path

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-0">
      <div className="w-full">
        <RoleNav />

        <section id="home" className="relative rounded-2xl overflow-hidden border border-slate-200">
          <div
            className="h-[420px] sm:h-[360px] lg:h-[420px] relative overflow-hidden"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url('${heroImageUrl}')`,
              }}
            />
            <div className="relative w-full h-full">
              <div className="flex items-end justify-end h-full">
                <div className="max-w-sm bg-blue-950/85 text-white rounded-2xl px-6 py-5 shadow-2xl m-4">
                  <p className="text-lg italic font-semibold text-center leading-relaxed">
                    "Himalayan Alert: IMD Forecasts Rainfall for Feb 18-19; Focus on Vulnerable Uttarkashi Slopes"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div id="alerts" className="bg-red-600 text-white text-sm font-semibold px-4 py-2">
            {homeSettings.alert_text}
          </div>
        </section>

        <section id="services" className="py-12">
          <h2 className="text-4xl text-center font-serif text-blue-900">
            Our <span className="text-orange-500 italic">Services</span>
          </h2>
          <p className="text-center text-slate-600 mt-2 text-sm">
            providing comprehensive disaster management services to keep your community safe.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((item) => (
              <article key={item.title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <p className="text-xs font-bold tracking-wider bg-slate-100 inline-block px-2 py-1 rounded">{item.icon}</p>
                <h3 className="mt-3 font-semibold text-blue-900">{item.title}</h3>
                <p className="text-sm text-slate-600 mt-2">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="help" className="pb-14">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 grid md:grid-cols-2 gap-5 items-center">
            <div>
              <h3 className="text-3xl font-black text-blue-900">Our Mission: Unified Response</h3>
              <p className="mt-3 text-slate-600">
                By bridging the gap between survivors, volunteers, and rescue agencies, SahaayaSetu ensures that no call for help goes unanswered.
              </p>
              <Link to="/signin" className="inline-block mt-5 rounded-full border-2 border-orange-500 text-orange-500 px-5 py-2 font-semibold">
                Learn More About Us
              </Link>
            </div>
            <div
              className="h-56 rounded-xl text-white grid place-items-center text-2xl font-extrabold  bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(120deg, rgba(15,23,42,.7), rgba(59,130,246,0.2)), url('${unifiedImage}')` }}
            >
              Unified Relief Network
            </div>
          </div>
        </section>

        <footer className="bg-slate-950 text-slate-200 ">
          <div className="px-4 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-bold text-white">SahaayaSetu</h4>
              <p className="mt-2 text-slate-400">Empowering communities through unified response and technological resilience during disasters.</p>
            </div>
            <div>
              <h4 className="font-bold text-white">Quick Links</h4>
              <p className="mt-2 text-slate-400">Safety Guidelines</p>
              <p className="text-slate-400">Volunteer Registry</p>
              <p className="text-slate-400">Donation Portal</p>
              <p className="text-slate-400">Contact Authorities</p>
            </div>
            <div>
              <h4 className="font-bold text-white">Emergency Contacts</h4>
              <p className="mt-2 text-slate-400">Disaster Helpline: 90999 90999 </p>
              <p className="text-slate-400">Police: 100</p>
              <p className="text-slate-400">support@sahaayasetu.gov.in</p>
            </div>
            <div>
              <h4 className="font-bold text-white ">Newsletter</h4>
              <div className="mt-2 flex gap-2">
                <input className="w-full rounded-md px-3 py-2 text-slate-900 border border-amber-50 text-white" placeholder="Email" />
                <button className="rounded-md bg-orange-500 px-3 py-2 text-white">Go</button>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <AssistantHub />
    </main>
  )
}
