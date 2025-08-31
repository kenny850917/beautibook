//trigger
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-gray-900 mb-4 tracking-tight">
              Downtown Beauty
              <span className="block font-normal text-purple-600">Lounge</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
              Where elegance meets expertise. Experience luxury beauty services
              in the heart of downtown.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="mb-16">
            <Link
              href="/booking"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Book Your Appointment
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>

          {/* Operating Hours */}
          <div className="text-sm text-gray-500 font-light">
            <p>Tuesday - Saturday</p>
            <p>9:00 AM - 6:00 PM PST</p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-4">
              Signature Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-light">
              Indulge in our carefully curated selection of premium beauty
              treatments, each designed to enhance your natural radiance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Haircut */}
            <div className="text-center group">
              <div className="mb-6 p-8 bg-white rounded-2xl shadow-sm group-hover:shadow-md transition-shadow duration-200">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Haircut
                </h3>
                <p className="text-gray-600 text-sm mb-4 font-light">
                  Professional cut and styling to enhance your natural beauty
                </p>
                <div className="space-y-1">
                  <p className="text-2xl font-light text-gray-900">$65</p>
                  <p className="text-sm text-gray-500">60 minutes</p>
                </div>
              </div>
            </div>

            {/* Hair Color */}
            <div className="text-center group">
              <div className="mb-6 p-8 bg-white rounded-2xl shadow-sm group-hover:shadow-md transition-shadow duration-200">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3V1m0 18v2m8-10h2m-2 4h2m-2-8h2m-2-4h2"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Hair Color
                </h3>
                <p className="text-gray-600 text-sm mb-4 font-light">
                  Full color transformation with premium products
                </p>
                <div className="space-y-1">
                  <p className="text-2xl font-light text-gray-900">$120</p>
                  <p className="text-sm text-gray-500">2 hours</p>
                </div>
              </div>
            </div>

            {/* Highlights */}
            <div className="text-center group">
              <div className="mb-6 p-8 bg-white rounded-2xl shadow-sm group-hover:shadow-md transition-shadow duration-200">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Highlights
                </h3>
                <p className="text-gray-600 text-sm mb-4 font-light">
                  Beautiful highlights to add dimension and brightness
                </p>
                <div className="space-y-1">
                  <p className="text-2xl font-light text-gray-900">$150</p>
                  <p className="text-sm text-gray-500">3 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* About Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-8">
            Expert Stylists
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto font-light leading-relaxed mb-12">
            Our talented team of beauty professionals brings years of experience
            and passion to every appointment. From precision cuts to stunning
            color transformations, we&apos;re dedicated to helping you look and
            feel your absolute best.
          </p>

          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                <span className="text-2xl font-medium text-purple-600">S</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Sarah Johnson</h3>
              <p className="text-sm text-gray-500 font-light">
                Senior Stylist • All Services
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                <span className="text-2xl font-medium text-purple-600">M</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Mike Rodriguez</h3>
              <p className="text-sm text-gray-500 font-light">
                Expert Barber • Precision Cuts
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                <span className="text-2xl font-medium text-purple-600">L</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Lisa Chen</h3>
              <p className="text-sm text-gray-500 font-light">
                Color Specialist • Highlights Expert
              </p>
            </div>
          </div>

          {/* Secondary CTA */}
          <Link
            href="/booking"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-purple-600 bg-white border-2 border-purple-600 hover:bg-purple-600 hover:text-white transition-colors duration-200 rounded-full"
          >
            Schedule Your Visit
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-4">
              Why Choose Us
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                5-Minute Hold System
              </h3>
              <p className="text-sm text-gray-600 font-light">
                Reserve your preferred time slot with our innovative booking
                technology
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                Premium Products
              </h3>
              <p className="text-sm text-gray-600 font-light">
                Only the finest professional-grade products for exceptional
                results
              </p>
            </div>

            <div className="text-center sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                Personalized Care
              </h3>
              <p className="text-sm text-gray-600 font-light">
                Tailored consultations and treatments designed just for you
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-6">
            Ready to Transform Your Look?
          </h2>
          <p className="text-lg text-gray-600 mb-8 font-light">
            Book your appointment today and discover the Downtown Beauty Lounge
            difference.
          </p>

          <Link
            href="/booking"
            className="inline-flex items-center justify-center px-10 py-4 text-lg font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Start Booking Process
            <svg
              className="ml-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z"
              />
            </svg>
          </Link>

          <p className="text-sm text-gray-500 mt-6 font-light">
            Your time slot will be held for 5 minutes during booking
          </p>
        </div>
      </section>
    </div>
  );
}
