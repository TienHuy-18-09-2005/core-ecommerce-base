<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkOrderStatusRequest;
use App\Http\Requests\Admin\ListAdminOrdersRequest;
use App\Http\Requests\Admin\OrderNoteRequest;
use App\Http\Requests\Admin\PrintOrdersRequest;
use App\Http\Requests\Admin\UpdateOrderStatusRequest;
use App\Models\Order;
use App\Services\Admin\AdminOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OrderController extends Controller
{
    public function __construct(private AdminOrderService $orderService) {}

    public function index(ListAdminOrdersRequest $request): JsonResponse
    {
        return $this->paginated($this->orderService->list($request->validated()), fn ($o) => $this->orderService->summary($o));
    }

    public function counts(ListAdminOrdersRequest $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->orderService->statusCounts($request->validated())]);
    }

    public function latest(Request $request): JsonResponse
    {
        $since = $request->validate(['since' => ['nullable', 'integer', 'min:0']])['since'] ?? null;

        return response()->json(['success' => true, 'data' => $this->orderService->latest($since !== null ? (int) $since : null)]);
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->orderService->detail($order)]);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $data = $request->validated();
        if ($data['status'] === 'cancelled') {
            Gate::authorize('cancel', $order);
        }
        $order = $this->orderService->updateOrderStatus($order->id, $data['status'], $data['admin_note'] ?? null, $data['cancel_reason'] ?? null);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái đơn hàng thành công!',
            'data' => $this->orderService->detail($order),
        ]);
    }

    public function bulkStatus(BulkOrderStatusRequest $request): JsonResponse
    {
        $data = $request->validated();
        if ($data['status'] === 'cancelled') {
            Gate::authorize('cancel', Order::class);
        }
        $res = $this->orderService->bulkStatus(array_map('intval', $data['ids']), $data['status'], $data['cancel_reason'] ?? null, $data['admin_note'] ?? null);

        return response()->json([
            'success' => true,
            'message' => "Đã cập nhật {$res['succeeded']}/".count($res['results']).' đơn.',
            'data' => $res,
        ]);
    }

    public function addNote(OrderNoteRequest $request, Order $order): JsonResponse
    {
        $note = $this->orderService->addNote($order, trim($request->validated()['body']));

        return response()->json(['success' => true, 'message' => 'Đã thêm ghi chú.', 'data' => $this->orderService->noteArray($note)], 201);
    }

    public function print(PrintOrdersRequest $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->orderService->printData(array_map('intval', $request->validated()['ids']))]);
    }
}
