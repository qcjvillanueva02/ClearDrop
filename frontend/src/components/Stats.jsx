import React from 'react';

export default function Stats() {
  return (
    <div className="stats">
      <div className="wrap">
        <div className="stat">
          <b>0 W</b>
          <span>Basic model power use</span>
        </div>
        <div className="stat">
          <b>5</b>
          <span>Filter media stages</span>
        </div>
        <div className="stat">
          <b>1</b>
          <span>Gravity-powered flow</span>
        </div>
        <div className="stat">
          <b>DIY</b>
          <span>Replaceable filter media</span>
        </div>
      </div>
    </div>
  );
}
