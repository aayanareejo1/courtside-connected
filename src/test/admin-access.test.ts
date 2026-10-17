import { describe, expect, it, vi, beforeEach } from "vitest";
const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (input: unknown) => unknown = input => input;
    const builder = {
      middleware: () => builder,
      inputValidator: (validator: ((input: unknown) => unknown) | { parse: (input: unknown) => unknown }) => { validate = typeof validator === "function" ? validator : input => validator.parse(input); return builder; },
      handler: (handler: (args: unknown) => unknown) => (args: { data?: unknown }) => handler({ ...args, data: validate(args.data), context: { supabase: { rpc, from }, userId: "staff-user" } }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { saveAnnouncement, deleteAnnouncement, loadStaff } from "@/lib/admin.functions";
const event_id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => vi.clearAllMocks());
describe("staff server write boundaries", () => {
  it("rejects non-staff writes before querying content tables", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(saveAnnouncement({ data: { event_id, title: "Update", body: "", severity: "info", starts_at: null, ends_at: null, division_id: null, area_id: null, published: true } })).rejects.toThrow("Staff access required");
    expect(from).not.toHaveBeenCalled();
  });
  it("rejects non-staff deletes before querying content tables", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(deleteAnnouncement({ data: { id: event_id, event_id } })).rejects.toThrow("Staff access required");
    expect(from).not.toHaveBeenCalled();
  });
  it("rejects non-staff loading of the staff page", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(loadStaff({})).rejects.toThrow("Staff access required");
    expect(from).not.toHaveBeenCalled();
  });
  it("does not treat failed role checks as permission", async () => {
    rpc.mockResolvedValue({ data: true, error: new Error("Role lookup failed") });
    await expect(saveAnnouncement({ data: { event_id, title: "Update", body: "", severity: "info", starts_at: null, ends_at: null, division_id: null, area_id: null, published: true } })).rejects.toThrow("Staff access required");
    expect(from).not.toHaveBeenCalled();
  });
});
