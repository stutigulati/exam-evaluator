function money(value, digits = 6) {
  return `$${Number(value || 0).toFixed(digits)}`;
}

function rupees(value, digits = 4) {
  return `₹${Number(value || 0).toFixed(digits)}`;
}

export default function TokenCostTab({ result }) {
  const cost = result.cost || {};
  const gemini = cost.gemini || {};
  const vision = cost.google_vision || {};
  const usage = result.usage || {};

  const inputTokens = gemini.input_tokens ?? usage.input_tokens ?? 0;
  const outputTokens = gemini.output_tokens ?? usage.output_tokens ?? 0;
  const totalTokens = gemini.total_tokens ?? usage.total_tokens ?? inputTokens + outputTokens;
  const totalUSD = cost.total_usd ?? gemini.cost_usd ?? 0;
  const totalINR = cost.total_inr ?? 0;
  const usdToInr = cost.usd_to_inr ?? 84;

  const cards = [
    { label: 'OCR UNITS', value: vision.units ?? 0, bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
    { label: 'INPUT TOKENS', value: inputTokens, bg: 'rgba(0,200,150,0.1)', border: 'rgba(0,200,150,0.25)' },
    { label: 'OUTPUT TOKENS', value: outputTokens, bg: 'rgba(62,230,127,0.1)', border: 'rgba(62,230,127,0.25)' },
    { label: 'TOTAL COST', value: `${money(totalUSD)} / ${rupees(totalINR)}`, bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', highlight: true },
  ];

  const rows = [
    ['Google Vision feature', vision.feature || 'DOCUMENT_TEXT_DETECTION'],
    ['Google Vision units', vision.units ?? 0],
    ['Google Vision price', `${money(vision.price_per_1000_units_usd || 1.5, 2)} / 1,000 units`],
    ['Google Vision cost', `${money(vision.cost_usd)} (${rupees(vision.cost_inr)})`],
    ['Gemini model', gemini.model || 'gemini-2.5-flash-lite'],
    ['Gemini input price', `${money(gemini.input_price_per_1m_tokens_usd || 0.1, 2)} / 1M tokens`],
    ['Gemini output price', `${money(gemini.output_price_per_1m_tokens_usd || 0.4, 2)} / 1M tokens`],
    ['Gemini input cost', `${money(gemini.input_cost_usd)} (${rupees((gemini.input_cost_usd || 0) * usdToInr)})`],
    ['Gemini output cost', `${money(gemini.output_cost_usd)} (${rupees((gemini.output_cost_usd || 0) * usdToInr)})`],
    ['Gemini total cost', `${money(gemini.cost_usd)} (${rupees(gemini.cost_inr)})`],
    ['USD to INR rate', `₹${usdToInr}`],
    ['Combined total', `${money(totalUSD)} (${rupees(totalINR)})`],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-white">OCR + AI Usage & Cost</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <div className="text-xs uppercase tracking-wider mb-1 font-medium" style={{ color: c.highlight ? '#fbbf24' : '#8a9087' }}>{c.label}</div>
            <div className="text-xl font-bold font-mono" style={{ color: c.highlight ? '#fbbf24' : '#f4f5f2' }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#111311', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold text-white">Pricing Breakdown</p>
        </div>
        <div className="px-5 py-3">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td className="py-3 pr-4" style={{ color: '#8a9087' }}>{label}</td>
                  <td className="py-3 font-mono font-medium" style={{ color: i === rows.length - 1 ? '#fbbf24' : '#f4f5f2' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs" style={{ color: '#4f564f' }}>
        Estimate uses list pricing and does not apply monthly free-tier credits, taxes, or currency conversion changes.
      </p>
    </div>
  );
}
