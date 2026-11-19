export function CollarNfcArt({dogName}:{dogName:string}){
 return <svg className="walk-collar-art" viewBox="0 0 420 240" role="img" aria-label={`Illustration of ${dogName}'s collar with an NFC tag and a phone`}>
  <path className="walk-collar-ground" d="M25 187c56-32 126-34 191-17 74 19 125 9 178-9v50H25z"/>
  <g className="walk-collar-band"><path d="M62 104c28-20 134-20 172 0v60c-42 21-146 21-172 0z"/><path d="M62 104c25 20 149 23 172 0M62 164c28-20 142-20 172 0"/><rect x="99" y="111" width="40" height="46" rx="7"/><path d="M119 111v46M119 134h28"/><circle cx="173" cy="135" r="2"/><circle cx="188" cy="135" r="2"/><circle cx="203" cy="135" r="2"/></g>
  <path className="walk-collar-outline" d="M220 161v14"/>
  <circle className="walk-collar-tag" cx="220" cy="185" r="27"/>
  <path className="walk-collar-mark" d="M210 190c6-6 6-14 0-20M217 195c10-8 10-21 0-29M225 200c14-11 14-29 0-39"/>
  <g className="walk-collar-phone"><rect className="walk-collar-outline" x="320" y="56" width="57" height="114" rx="12"/><path className="walk-collar-outline" d="M339 68h19"/><circle className="walk-collar-dot" cx="348" cy="155" r="3"/></g>
  <g className="walk-collar-waves"><path d="M280 111c9 9 9 24 0 33"/><path d="M291 101c15 15 15 37 0 53"/></g>
 </svg>
}
