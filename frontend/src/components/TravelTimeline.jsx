import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

export default function TravelTimeline({ timeline, currency = 'INR' }) {
  if (!timeline || timeline.length === 0) return null;

  const symbol = currency === 'INR' ? '₹' : '$';

  return (
    <div className="relative border-l border-travel-accent-gray ml-3 pl-4 space-y-6 py-2">
      {timeline.map((dayItem, dayIdx) => (
        <div key={dayIdx} className="relative">
          
          {/* Timeline Dot Indicator */}
          <span className="absolute -left-[25px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-travel-button-blue ring-4 ring-travel-bg-gray">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>

          {/* Day Title */}
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 rounded bg-travel-accent-blue px-2 py-0.5 text-3xs font-bold uppercase tracking-wider text-travel-button-blue">
              Day {dayItem.day}
            </span>
            <h5 className="text-2xs font-bold text-travel-text-primary mt-1">
              {dayItem.title}
            </h5>
          </div>

          {/* Day Activities */}
          <div className="space-y-3.5 pl-2">
            {dayItem.activities?.map((act, actIdx) => (
              <div key={actIdx} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-travel-bg-white border border-travel-accent-gray hover:border-travel-accent-blue/40 transition">
                <div className="flex gap-2.5 items-start">
                  <Clock className="h-4 w-4 text-travel-text-muted mt-0.5 shrink-0" />
                  <div>
                    <span className="text-3xs font-semibold text-travel-text-muted">{act.time}</span>
                    <p className="text-2xs text-travel-text-primary leading-relaxed mt-0.5">{act.activity}</p>
                  </div>
                </div>

                {act.cost !== undefined && act.cost > 0 && (
                  <span className="text-3xs font-semibold text-travel-text-secondary whitespace-nowrap bg-travel-bg-soft border border-travel-accent-gray px-1.5 py-0.5 rounded">
                    {symbol}{act.cost}
                  </span>
                )}
              </div>
            ))}
          </div>

        </div>
      ))}
    </div>
  );
}
