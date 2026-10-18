import { LOGO_DEFS } from './logoDefs'

// Hidden SVG symbol sheet (kaf wordmark + infinity loop) referenced via <use href="#kf-...">.
export default function SvgDefs() {
  return <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden dangerouslySetInnerHTML={{ __html: LOGO_DEFS }} />
}
