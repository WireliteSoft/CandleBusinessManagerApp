import { Flame } from 'lucide-react';

const HOT_THROW_TIPS = [
  {
    title: 'Add fragrance oil to wax at 185F',
    details: [
      'Fragrance oil needs to properly bind with wax to throw fragrance.',
      'Making sure your wax is hot enough before adding fragrance oil is one of the best ways to help ensure a strong bond.',
      'You can bump the wax temperature to 190F for particularly dense fragrance oils.',
    ],
  },
  {
    title: 'Thoroughly stir fragrance oil and wax',
    details: [
      'Stirring thoroughly is another key step for a strong bond.',
      'Begin slowly stirring immediately after adding fragrance oil and continue for 2 minutes, or until you reach your desired pour temperature.',
      'Right before pouring, stir again, especially for waxes that need time to cool to pour temperature.',
    ],
  },
  {
    title: 'Test different fragrance loads',
    details: [
      'Adding more fragrance oil is not always the best way to achieve stronger hot throw.',
      'Start 1-2% lower than your wax maximum load, then adjust as needed. Example: if max load is 10%, start at 8%.',
      'Starting lower helps avoid overloading the wax, which can create burn and performance issues that reduce throw.',
    ],
  },
  {
    title: 'Weigh supplies on a scale',
    details: [
      'Candle formulas use weight measurements, so weigh wax and fragrance oil on a scale.',
      'Use a consistent unit of weight. In the U.S., ounces are common.',
      'Avoid fluid ounces, measuring cups, and spoons, because those are volume measurements.',
    ],
  },
  {
    title: 'Perfect your melt pool',
    details: [
      'A full melt pool is fundamental to strong hot throw, so wick selection matters.',
      'Reevaluate burn performance whenever you change any component, even small ones such as fragrance oil.',
      'Example: a setup that burns well with one fragrance may need a wick adjustment with a different fragrance.',
    ],
  },
  {
    title: 'Diameter matters',
    details: [
      'The larger the candle melt pool, the stronger the hot throw can be.',
      'Containers with larger diameters allow larger melt pools, which can improve throw.',
      'If your hot throw is still weak after other adjustments, test wider containers.',
    ],
  },
] as const;

export default function HotThrowTipsInfo() {
  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-orange-100 p-2 text-orange-700">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Top 6 tips for impressive hot throw</h2>
            <p className="mt-2 text-sm text-gray-600">
              Let&apos;s go over our favorite tips to help conquer your hot throw woes.
            </p>
          </div>
        </div>

        <ol className="mt-6 space-y-5">
          {HOT_THROW_TIPS.map((tip, index) => (
            <li key={tip.title} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-base font-semibold text-gray-900">
                {index + 1}. {tip.title}
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-700">
                {tip.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900">Prep for success</h2>
        <p className="mt-2 text-sm text-gray-600">
          Even perfectly made candles sometimes disappoint hot throw aficionados. Set yourself up for success by keeping these key points in mind.
        </p>
        <div className="mt-6 space-y-5">
          <article className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-base font-semibold text-gray-900">
              Think of candle making as baking, not cooking.
            </h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>It is fine to play around with recipes and eyeball measurements when cooking, but baking requires precision to achieve the desired outcome.</li>
              <li>Be as precise as possible when measuring, checking temperatures, and following directions.</li>
              <li>Keep a notepad and pen handy to record the weights of supplies used, pour temp, types of supplies used, and any differences you notice.</li>
            </ul>
          </article>

          <article className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-base font-semibold text-gray-900">Get to know your wax.</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>Always familiarize yourself with the properties of your wax before making candles.</li>
              <li>Note the maximum fragrance load, cure time requirements, and suggested wick series.</li>
              <li>In general, paraffin waxes need to cure for 3-5 days, while soy and other natural waxes should cure for at least 1-2 weeks.</li>
            </ul>
          </article>

          <article className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-base font-semibold text-gray-900">Thoughtfully select supplies.</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>Paraffin wax is the best option if super-strong hot throw is your ultimate goal.</li>
              <li>Just as artists choose different materials for different outcomes, candle makers can choose different waxes for different goals.</li>
              <li>You can achieve strong hot throw with soy wax, but it may take more testing, fragrance oil, wider containers, and experience.</li>
              <li>Many store-bought candles are made with paraffin or paraffin blends.</li>
              <li>Try a paraffin blend wax if 100% paraffin wax is not appealing.</li>
            </ul>
          </article>

          <article className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-base font-semibold text-gray-900">Set expectations accordingly.</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>Some uncontrollable variables affect hot throw perception, so test in multiple settings and gather opinions from different people.</li>
              <li>Environmental variables like high ceilings, humidity, and drafty rooms can affect hot throw perception.</li>
              <li>Sense of smell varies by person and can change due to medications, hormones, illness, and nose blindness.</li>
              <li>If you have worked with one fragrance for a while, it may smell weaker to you than to others.</li>
              <li>Expecting a 1.5 inch candle to fill a large room with strong scent will likely lead to disappointment.</li>
              <li>Expecting a soy candle to match paraffin strength can also lead to frustration.</li>
              <li>Realistic expectations are the best starting point for evaluating hot throw and avoiding frustration.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4 md:p-5">
        <p className="text-sm text-amber-900">
          Reference for these tips:{' '}
          <a
            href="https://www.candlescience.com/learning/candle-making-101-hot-throw/?lid=wybsqsi2wv7p&utm_source=email&utm_medium=canvas&utm_campaign=PostPurchase_FragranceOilEmail1"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline hover:text-amber-700"
          >
            CandleScience - Candle Making 101: Hot Throw
          </a>
        </p>
      </section>
    </div>
  );
}
