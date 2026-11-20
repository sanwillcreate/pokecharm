import './style.css'
import './installer.css'
import './brand.css'
import { companions } from './companions'
import { creatureRegistry, getCreatureForCompanion, loadCreature } from './creature-registry'
import { createAnimationController } from './creature-animation'
import { mountCompanionInstaller } from './companion-installer'
import { mountHeroShowcase } from './hero-showcase'
import { mountCompanionPreview } from './widget'
import { inject } from '@vercel/analytics'

// Initialize Vercel Web Analytics
inject()

const app = document.querySelector<HTMLElement>('#app')!

app.innerHTML = `
  <header class="site-header wrap">
    <a class="wordmark" href="#top" aria-label="Pokecharm home">pokecharm<i class="wordmark-pixel" aria-hidden="true"></i></a>
    <nav class="site-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#experience">The experience</a><a href="#install">Install</a></nav>
    <a class="header-cta" href="#install">Get your companion</a>
  </header>
  <main id="top">
    <section class="hero wrap">
      <div class="hero-copy">
      
        <h1>Your website deserves<br><em>a little companion.</em></h1>
        <p class="hero-subtitle">A friendly pixel companion that lives in a corner of your site, greets visitors, and makes the place feel like yours.</p>
        <div class="hero-actions"><a class="button button-dark" href="#preview">Meet your companion</a><a class="text-link" href="#how-it-works">See how it works</a></div>
      </div>
      <div class="hero-art" id="hero-showcase"></div>
    </section>

    <section class="preview-section section-pad" id="preview">
      <div class="wrap">
        <div class="section-heading">
          <div><p class="eyebrow">Meet your companion</p><h2>A little life,<br><em>inside your website.</em></h2></div>
          <p>Choose a personality, name your companion, and spend a little time together.</p>
        </div>
        <div class="demo-layout">
          <div class="demo-selection">
            <span class="field-label">Choose a personality</span>
            <div class="selection-list">${companions.map((companion, index) => {
              const creature = getCreatureForCompanion(companion.id)
              return `<button class="selection-option ${index === 0 ? 'active' : ''}" type="button" data-companion="${companion.id}" aria-pressed="${index === 0}"><span class="selection-thumb" style="--swatch:${creature?.theme.accent ?? '#54b8e8'}" aria-hidden="true"><span class="selection-thumb-art" data-thumb="${creature?.id ?? ''}"><span class="creature-sprite"></span></span></span><span class="selection-copy"><b>${companion.label}</b><small>${companion.description}</small></span></button>`
            }).join('')}</div>
          </div>
          <div class="widget-column"><div id="pet-preview"></div></div>
        </div>
      </div>
    </section>

    <section class="installer-section section-pad" id="install">
      <div class="wrap">
        <div class="section-heading">
          <div><p class="eyebrow">Make them at home</p><h2>Your companion,<br><em>your corner of the web.</em></h2></div>
          <p>Choose a companion, give them a name, and add them to your site.</p>
        </div>
        <div id="companion-installer"></div>
      </div>
    </section>

    <section class="how-section section-pad" id="how-it-works">
      <div class="wrap">
        <div class="section-heading">
          <div><p class="eyebrow">Simple by design</p><h2>Three steps to<br><em>feeling at home.</em></h2></div>
          <p>Pick one, give it a place, and let your visitors become part of its story.</p>
        </div>
        <ol class="steps">
          <li class="step"><span class="step-number">01</span><div><h3>Choose your companion</h3><p>Find a personality that suits your site, then give it a name that’s yours.</p></div></li>
          <li class="step"><span class="step-number">02</span><div><h3>Give it a home</h3><p>It settles into a quiet corner, ready to greet visitors without getting in their way.</p></div></li>
          <li class="step"><span class="step-number">03</span><div><h3>Enjoy the little moments</h3><p>Pat it, watch it wander, or let it rest. Every visit feels a little more personal.</p></div></li>
        </ol>
      </div>
    </section>

    <section class="experience-section section-pad" id="experience">
      <div class="wrap experience-layout">
        <div>
          <p class="eyebrow">A companion, not a collection</p>
          <h2>Personality lives<br><em>in the little things.</em></h2>
          <p class="experience-copy">The fun isn’t in collecting characters. It’s in the familiar hello, the quiet moments, and the personality that shows in each small interaction.</p>
          <a href="#preview" class="inline-link">Try the companion demo</a>
        </div>
        <ol class="experience-list">
          <li><span class="experience-number"></span><div><h3>Distinct personalities</h3><p>Each companion has its own temperament and a distinct way of responding to a little attention.</p></div></li>
          <li><span class="experience-number"></span><div><h3>Small, occasional moments</h3><p>A gentle idle movement, a blink, or a thoughtful pause. Never a distraction.</p></div></li>
          <li><span class="experience-number"></span><div><h3>Dialogue with a sense of timing</h3><p>Greetings, playful reactions, and quiet thoughts appear when they feel natural.</p></div></li>
          <li><span class="experience-number"></span><div><h3>Made for small moments</h3><p>Sleep, idle movement, and playful reactions give each companion its own rhythm.</p></div></li>
        </ol>
      </div>
    </section>

    <section class="closing-section">
      <div class="wrap closing-inner">
        <p class="closing-line">A small companion can make a place memorable.</p>
        <h2>A little companion.<br><em>A more personal website.</em></h2>
        <a class="button button-light" href="#preview">Meet your companion</a>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <p class="footer-statement">Give your website<br><em>a little life.</em></p>
      <div class="footer-bottom">
        <a class="wordmark" href="#top">pokecharm<i class="wordmark-pixel" aria-hidden="true"></i></a>
        <nav class="footer-nav" aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#experience">The experience</a><a href="#preview">Try the demo</a><a href="#install">Install</a></nav>
        <a class="footer-social-link" href="https://x.com/sanstwwt" target="_blank" rel="noopener noreferrer" aria-label="Follow Pokecharm on X">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.9 1.15h3.68l-8.04 9.19L24 23.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93L18.9 1.15Zm-1.29 20.04h2.04L6.48 3.29H4.29l13.32 17.9Z" /></svg>
        </a>
        <small>© 2026 Pokecharm</small>
      </div>
    </div>
  </footer>
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

// Real creature artwork in the personality selector, animated in place.
document.querySelectorAll<HTMLElement>('[data-thumb]').forEach((wrapper) => {
  const creature = creatureRegistry.find((item) => item.id === wrapper.dataset.thumb)
  if (!creature) return
  const sprite = wrapper.querySelector<HTMLElement>('.creature-sprite')!
  const animation = createAnimationController()
  animation.bind(sprite, wrapper)
  loadCreature(creature)
    .then((loaded) => animation.setCreature(loaded))
    .catch((error: unknown) => console.error(`Could not load ${creature.displayName} artwork`, error))
})
