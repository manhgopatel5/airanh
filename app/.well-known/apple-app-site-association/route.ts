export async function GET() {
  return Response.json({
    applinks: {
      apps: [],
      details: [{
        appIDs: ["*"],
        paths: ["*"]
      }]
    }
  }, {
    headers: { 'Content-Type': 'application/json' }
  });
}