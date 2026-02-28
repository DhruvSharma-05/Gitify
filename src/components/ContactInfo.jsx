import React from 'react'

export default function ContactInfo() {
  return (
    <section className="contact-info">
      <h2>Contact</h2>
      <p className="lead">I'd love to hear from you — reach out any time But only  between 10 pm to 09:59 pm.</p>

      <div className="contacts">
        <div className="contact-card">
          <h3>Email</h3>
          <a href="ashutosh@revclerx.com">hello@example.com</a>
        </div>

        <div className="contact-card">
          <h3>Phone</h3>
          <a href="tel:+1234567890">+1 (234) 567-890</a>
        </div>

        <div className="contact-card">
          <h3>Social</h3>
          <div className="social-links">
            <a href="https://github.com/your-username" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://www.linkedin.com/in/your-username" target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </div>
      </div>
    </section>
  )
}
