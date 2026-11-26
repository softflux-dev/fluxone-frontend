import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RATING_BANDS } from '@/lib/branch/performanceRatings'
import { formatScorePercent } from '@/lib/branch/performanceScales'
import { formatDateLine, formatDateTimeInline } from '@/lib/formatDateTime'

// Chart tooltip for a trend point
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-600 dark:bg-slate-800">
      <p className="font-semibold text-slate-800 dark:text-slate-100">
        {formatDateTimeInline(row.scoredAt)}
      </p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Score: <strong>{formatScorePercent(row.totalScore)}</strong> · {row.ratingLabel}
      </p>
      {row.changeDelta != null ? (
        <p className="mt-0.5 text-slate-600 dark:text-slate-300">
          Change: {row.changeDelta > 0 ? '+' : ''}
          {row.changeDelta} pts
        </p>
      ) : (
        <p className="mt-0.5 text-slate-500 dark:text-slate-400">First evaluation</p>
      )}
      {row.evaluatorName ? (
        <p className="mt-0.5 text-slate-500 dark:text-slate-400">by {row.evaluatorName}</p>
      ) : null}
    </div>
  )
}

// Clickable activeDot so hover + click bind the same evaluationId
function ActiveDot({ cx, cy, payload, onPointClick }) {
  if (cx == null || cy == null || !payload) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill="#4c1d95"
      stroke="#fff"
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation()
        if (payload.evaluationId) onPointClick?.(payload.evaluationId)
      }}
    />
  )
}

export function PerformanceTrendChart({ chart, onPointClick }) {
  // Chronological order + unique X key per evaluation so same-day scores do not collide
  const data = useMemo(() => {
    return [...(chart?.points || [])]
      .sort((a, b) => new Date(a.scoredAt) - new Date(b.scoredAt))
      .map((p, index) => ({
        ...p,
        index,
        pointKey: p.evaluationId || `pt-${index}-${p.scoredAt}`,
        label: formatDateLine(p.scoredAt),
      }))
  }, [chart?.points])

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Score trend
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total score over time (0–100%)
          </p>
        </div>
      </div>

      {!data.length ? (
        <p className="py-16 text-center text-sm text-slate-400 dark:text-slate-300">
          No scores in this range
        </p>
      ) : (
        // text color here feeds currentColor for ticks and grid
        <div className="h-72 w-full text-slate-500 dark:text-slate-400">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 28, right: 28, left: 0, bottom: 8 }}
              onClick={(state) => {
                const id = state?.activePayload?.[0]?.payload?.evaluationId
                if (id) onPointClick?.(id)
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                strokeOpacity={0.25}
              />
              {RATING_BANDS.map((band) => (
                <ReferenceArea
                  key={band.label}
                  y1={band.min}
                  y2={band.max === 100 ? 100 : band.max}
                  fill={band.fill}
                  ifOverflow="extendDomain"
                />
              ))}
              <XAxis
                dataKey="pointKey"
                padding={{ left: 15, right: 15 }}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                tickFormatter={(_, i) => data[i]?.label || ''}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                width={36}
                tick={{ fontSize: 11, fill: 'currentColor' }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="totalScore"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props
                  if (cx == null || cy == null || !payload) return null
                  return (
                    <g
                      key={payload.pointKey}
                      onClick={(e) => {
                        e.stopPropagation()
                        onPointClick?.(payload.evaluationId)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload.isLatest ? 6 : 4}
                        fill={payload.isLatest ? '#4c1d95' : '#7c3aed'}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                      <text
                        x={cx}
                        y={cy - 10}
                        textAnchor="middle"
                        fontSize={10}
                        className="fill-slate-700 dark:fill-slate-200"
                      >
                        {Math.round(payload.totalScore)}
                      </text>
                    </g>
                  )
                }}
                activeDot={(props) => <ActiveDot {...props} onPointClick={onPointClick} />}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default PerformanceTrendChart