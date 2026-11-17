import './style.css'
import './installer.css'
import { companions } from './companions'
import { getCreatureForCompanion } from './creature-registry'
import { mountCompanionInstaller } from './companion-installer'
import { mountHeroShowcase } from './hero-showcase'
import { mountCompanionPreview } from './widget'
import { inject } from '@vercel/analytics'

// Initialize Vercel Web Analytics
inject()

const app = document.querySelector<HTMLElement>('#app')!

app.innerHTML = `
  <header class="site-header wrap">
    <a class="wordmark" href="#top" aria-label="Pokecharm home">pokecharm<span>.</span></a>
    <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#experience">The experience</a><a href="#install">Install</a></nav>
    <a class="header-cta" href="#install">Get your companion</a>
  </header>
  <main id="top">
    <section class="hero wrap">
      <div class="hero-copy"><p class="eyebrow"><span></span>A small companion for your website</p><h1>Your website’s very own <em>little companion.</em></h1><p class="hero-subtitle">A friendly pixel pal that lives in a corner of your website, with little moments that make a site feel more personal.</p><div class="hero-actions"><a class="button button-dark" href="#preview">Meet your companion</a><a class="text-link" href="#how-it-works">See how it works</a></div><p class="hero-caption">A little presence that makes a website feel more like yours.</p></div>
      <div class="hero-art" id="hero-showcase"></div>
    </section>
    <section class="preview-section section-pad" id="preview"><div class="wrap"><div class="section-heading preview-heading"><div><p class="eyebrow"><span></span>Meet your companion</p><h2>A little life,<br><em>inside your website.</em></h2></div><p>Choose a companion, make them yours, and spend a little time together.</p></div><div class="demo-layout"><div class="demo-selection"><span class="field-label">CHOOSE A COMPANION</span><p>Four personalities to try. Names are yours to choose.</p><div class="selection-list">${companions.map((companion, index) => `<button class="selection-option ${index === 0 ? 'active' : ''}" type="button" data-companion="${companion.id}" aria-pressed="${index === 0}"><span class="selection-swatch" style="--swatch:${getCreatureForCompanion(companion.id)?.theme.accent ?? '#54b8e8'}"></span><span><b>${companion.label}</b><small>${companion.description}</small></span></button>`).join('')}</div><div class="selection-note">Choose a personality to meet its companion.</div></div><div class="widget-column"><div id="pet-preview"></div></div></div></div></section>
    <section class="installer-section section-pad" id="install"><div class="wrap"><div class="section-heading"><div><p class="eyebrow"><span></span>Make them at home</p><h2>Your companion,<br><em>your corner of the web.</em></h2></div><p>Choose a companion, give them a name, and add one small piece of code to your site.</p></div><div id="companion-installer"></div></div></section>
    <section class="how-section section-pad" id="how-it-works"><div class="wrap"><div class="section-heading"><div><p class="eyebrow"><span></span>Simple by design</p><h2>Three steps to<br><em>feeling at home.</em></h2></div><p>A companion should be easy to welcome in. Pick one, give it a place, and let your audience become part of its story.</p></div><div class="steps-grid"><article class="step-card"><span class="step-number">01</span><h3>Choose your companion</h3><p>Find a personality that feels at home on your website, then give your companion a name that’s yours.</p><div class="step-example"><span class="example-dot"></span><span>Bright · “Pip”</span></div></article><article class="step-card"><span class="step-number">02</span><h3>Give it a home</h3><p>Your companion sits quietly in a corner, ready to greet visitors without getting between them and your work.</p><div class="step-example mini-browser"><span>yourwebsite.com</span><b>hi, there</b></div></article><article class="step-card"><span class="step-number">03</span><h3>Enjoy the little moments</h3><p>Give your companion a pat, watch it wander, or let it settle into a quiet moment.</p><div class="step-example"><span class="example-dot"></span><span>Wander · Rest · Play</span></div></article></div></div></section>
    <section class="experience-section section-pad" id="experience"><div class="wrap experience-layout"><div><p class="eyebrow"><span></span>A companion, not a collection</p><h2>Personality lives<br><em>in the little things.</em></h2><p class="experience-copy">The fun isn’t in collecting characters. It’s in the familiar hello, the quiet moments, and the personality that comes through in each interaction.</p><a href="#preview" class="inline-link">Try the companion demo</a></div><div class="experience-list"><article><span class="experience-number">01</span><div><h3>Distinct personalities</h3><p>Each companion has its own temperament and a distinct way of responding to a little attention.</p></div></article><article><span class="experience-number">02</span><div><h3>Small, occasional moments</h3><p>Gentle idle movement, a blink, or a thoughtful emote. Never a distraction.</p></div></article><article><span class="experience-number">03</span><div><h3>Dialogue with a sense of timing</h3><p>Greetings, playful reactions, and quiet thoughts appear when they feel natural.</p></div></article><article><span class="experience-number">04</span><div><h3>Made for small moments</h3><p>Idle movement, sleep, and playful reactions give each companion its own rhythm.</p></div></article></div></div></section>
    <section class="closing-section"><div class="wrap closing-inner"><p class="eyebrow">A small companion can make a place memorable.</p><h2>A little companion.<br>A more personal website.</h2><a class="button button-dark" href="#preview">Meet your companion</a></div></section>
  </main>
  <footer class="site-footer wrap"><a class="wordmark" href="#top">pokecharm<span>.</span></a><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#experience">The experience</a><a href="#preview">Try the demo</a><a href="#install">Install</a></nav><small>© 2026 Pokecharm</small></footer>
`

const heroShowcase = mountHeroShowcase(document.querySelector<HTMLElement>('#hero-showcase')!)
window.addEventListener('pagehide', heroShowcase, { once: true })

const installer = mountCompanionInstaller(document.querySelector<HTMLElement>('#companion-installer')!)
window.addEventListener('pagehide', installer, { once: true })

const preview = document.querySelector<HTMLElement>('#pet-preview')!
const pet = mountCompanionPreview(preview)
document.querySelectorAll<HTMLButtonElement>('.selection-option').forEach((button) => {
  button.addEventListener('click', () => {
    pet.choose(button.dataset.companion ?? '')
    document.querySelectorAll('.selection-option').forEach((option) => {
      option.classList.remove('active')
      option.setAttribute('aria-pressed', 'false')
    })
    button.classList.add('active')
    button.setAttribute('aria-pressed', 'true')
  })
})
