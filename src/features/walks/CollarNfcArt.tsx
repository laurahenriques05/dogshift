export function CollarNfcArt({dogName}:{dogName:string}){
 return <svg className="walk-collar-art" viewBox="0 0 420 260" role="img" aria-label={`Illustration of ${dogName} wearing an NFC collar beside a phone`}>
  <path className="walk-collar-ground" d="M22 226c76-19 167-18 220-6 63 12 107 4 156-3v26H22z"/>
  <g className="walk-collar-outline">
   <path fill="#fffdf7" d="M104 116c-18 23-22 65-13 103l-9 10h53l8-40 14 40h54l-9-12c10-35 3-72-12-97l-2-30-50-14z"/>
   <path fill="#f0e6d3" d="M98 64c-16 8-22 31-15 48 5 11 17 10 22 0l8-25m57-26c20 9 30 31 23 49-5 12-17 12-23 1l-9-25"/>
   <path fill="#fffdf7" d="M104 63c9-24 54-23 68 1l3 39c-2 24-15 37-36 37-23 0-37-16-39-36z"/>
   <path d="M99 170c-28-5-40-22-33-38M111 226h20m29 0h20"/>
  </g>
  <circle className="walk-collar-dot" cx="119" cy="91" r="3"/><circle className="walk-collar-dot" cx="158" cy="91" r="3"/>
  <path className="walk-collar-mark" d="M131 108q8 7 16 0m-8 5v8m-10 2q10 8 20 0"/>
  <path className="walk-collar-outline" d="M108 138q29 15 60 0"/>
  <circle className="walk-collar-tag" cx="140" cy="157" r="16"/>
  <path className="walk-collar-mark" d="M136 151q6 6 0 12m6-16q10 10 0 20"/>
  <g className="walk-collar-phone"><rect className="walk-collar-outline" x="299" y="76" width="62" height="123" rx="12"/><path className="walk-collar-outline" d="M319 88h22"/><circle className="walk-collar-dot" cx="330" cy="184" r="3"/><path className="walk-collar-mark" d="m316 137 9 9 17-20"/></g>
  <g className="walk-collar-waves"><path d="M228 130q17 19 0 38m14-49q26 30 0 60"/></g>
 </svg>
}
