/**
 * Living background for the auth pages (login / register):
 *  - large blurred brand-colored orbs that slowly drift and "breathe"
 *  - tiny golden-blue sparks that float upward (like coins of tzedakah)
 * Pure CSS, transform/opacity only (GPU-friendly), honors reduced motion.
 */

const SPARKS = [
  { left: '8%',  delay: '0s',    dur: '11s', size: 4 },
  { left: '18%', delay: '3.2s',  dur: '14s', size: 3 },
  { left: '27%', delay: '6.5s',  dur: '12s', size: 5 },
  { left: '38%', delay: '1.4s',  dur: '16s', size: 3 },
  { left: '49%', delay: '8s',    dur: '13s', size: 4 },
  { left: '58%', delay: '4.6s',  dur: '15s', size: 3 },
  { left: '67%', delay: '0.8s',  dur: '12s', size: 5 },
  { left: '76%', delay: '7.2s',  dur: '17s', size: 3 },
  { left: '85%', delay: '2.6s',  dur: '13s', size: 4 },
  { left: '93%', delay: '5.4s',  dur: '15s', size: 3 },
]

const CSS = `
.ambi{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.ambi-orb{position:absolute;border-radius:50%;filter:blur(70px);opacity:.45;will-change:transform}
.ambi-orb.o1{width:480px;height:480px;background:radial-gradient(circle,#2563eb,transparent 65%);top:-160px;right:-120px;animation:ambi-drift1 22s ease-in-out infinite}
.ambi-orb.o2{width:420px;height:420px;background:radial-gradient(circle,#4f46e5,transparent 65%);bottom:-140px;left:-100px;animation:ambi-drift2 26s ease-in-out infinite}
.ambi-orb.o3{width:300px;height:300px;background:radial-gradient(circle,rgba(241,94,77,.55),transparent 65%);top:38%;left:55%;opacity:.22;animation:ambi-drift3 30s ease-in-out infinite}
@keyframes ambi-drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-60px,50px) scale(1.12)}}
@keyframes ambi-drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(70px,-45px) scale(1.08)}}
@keyframes ambi-drift3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-45px,-55px) scale(1.15)}66%{transform:translate(35px,30px) scale(.95)}}
.ambi-spark{position:absolute;bottom:-12px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#bfd5ff,#3b82f6 70%);box-shadow:0 0 8px 1px rgba(96,165,250,.55);opacity:0;animation:ambi-rise linear infinite;will-change:transform,opacity}
@keyframes ambi-rise{
  0%{transform:translateY(0) translateX(0);opacity:0}
  10%{opacity:.85}
  50%{transform:translateY(-46vh) translateX(14px)}
  88%{opacity:.5}
  100%{transform:translateY(-92vh) translateX(-10px);opacity:0}
}
.ambi-grid{position:absolute;inset:0;opacity:.05;background-image:linear-gradient(rgba(148,180,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(148,180,255,.7) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse at center,black 30%,transparent 75%)}
@media (prefers-reduced-motion:reduce){.ambi-orb,.ambi-spark{animation:none}.ambi-spark{display:none}}
`

export default function AuthAmbience() {
  return (
    <div className="ambi" aria-hidden>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ambi-grid" />
      <div className="ambi-orb o1" />
      <div className="ambi-orb o2" />
      <div className="ambi-orb o3" />
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="ambi-spark"
          style={{
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.dur,
          }}
        />
      ))}
    </div>
  )
}
