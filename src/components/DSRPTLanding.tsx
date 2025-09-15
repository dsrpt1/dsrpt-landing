export default function DSRPTLanding() {
  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0a0a0a",color:"#e5e5e5"}}>
      <div style={{textAlign:"center"}}>
        <h1 style={{fontSize:32,marginBottom:12}}>DSRPT</h1>
        <p style={{opacity:.7,marginBottom:16}}>Parametric risk pricing & hazard curves</p>
        <a href="https://risk.dsrpt.finance/quote" style={{padding:"10px 16px",borderRadius:12,background:"#1f1f1f",textDecoration:"none",color:"inherit"}}>
          Open Hazard Curve Quote
        </a>
      </div>
    </main>
  );
}
