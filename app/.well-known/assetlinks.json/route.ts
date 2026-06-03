export async function GET() {
  return Response.json([{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "web",
      site: "https://huha.online"
    }
  }]);
}