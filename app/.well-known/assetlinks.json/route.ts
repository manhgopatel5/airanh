export async function GET() {
  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "web",
        // SỬA: Phải match với domain user truy cập
        site: "https://huha.online" 
      }
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "web", 
        site: "https://www.huha.online" // THÊM DÒNG NÀY
      }
    }
  ]);
}