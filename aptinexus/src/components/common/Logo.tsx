import { Link } from 'react-router-dom'
import logo from '../../assets/aptinexus-logo.png'

/** Official logo, unmodified. It is only framed (cropped by CSS) inside a light container so it stays legible on the dark UI. */
export default function Logo({ height = 44 }: { height?: number }) {
  return (
    <Link to="/" aria-label="AptiNexus home" className="inline-block overflow-hidden rounded-xl bg-[#fcfcfc] shadow-md shadow-black/10 ring-1 ring-black/5" style={{ height, width: height * 5 }}>
      <img src={logo} alt="AptiNexus" className="h-full w-full object-cover" style={{ objectPosition: '50% 47%' }} />
    </Link>
  )
}
