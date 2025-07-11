#!/bin/bash

# API测试脚本
# 用于测试AI询盘管理CRM系统的所有API接口

set -e

# 配置
API_BASE_URL="http://localhost:3001/api"
TEST_EMAIL="admin@example.com"
TEST_PASSWORD="Admin123456"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查服务是否运行
check_service() {
    log_info "检查服务状态..."
    
    if curl -s "${API_BASE_URL%/api}/health" > /dev/null; then
        log_success "服务运行正常"
    else
        log_error "服务未运行，请先启动服务"
        exit 1
    fi
}

# 用户认证测试
test_auth() {
    log_info "测试用户认证..."
    
    # 登录测试
    local login_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
        "$API_BASE_URL/auth/login")
    
    if echo "$login_response" | grep -q '"success":true'; then
        log_success "登录测试通过"
        # 提取token
        TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$TOKEN" ]; then
            log_success "Token获取成功"
        else
            log_error "Token获取失败"
            return 1
        fi
    else
        log_error "登录测试失败: $login_response"
        return 1
    fi
    
    # 验证token测试
    local verify_response=$(curl -s -X GET \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE_URL/auth/me")
    
    if echo "$verify_response" | grep -q '"success":true'; then
        log_success "Token验证测试通过"
    else
        log_error "Token验证测试失败: $verify_response"
        return 1
    fi
}

# 用户管理测试
test_users() {
    log_info "测试用户管理..."
    
    # 获取用户列表
    local users_response=$(curl -s -X GET \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE_URL/users")
    
    if echo "$users_response" | grep -q '"success":true'; then
        log_success "用户列表获取测试通过"
    else
        log_error "用户列表获取测试失败: $users_response"
        return 1
    fi
}

# 部门管理测试
test_departments() {
    log_info "测试部门管理..."
    
    # 获取部门列表
    local dept_response=$(curl -s -X GET \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE_URL/departments")
    
    if echo "$dept_response" | grep -q '"success":true'; then
        log_success "部门列表获取测试通过"
    else
        log_error "部门列表获取测试失败: $dept_response"
        return 1
    fi
}

# 询盘管理测试
test_inquiries() {
    log_info "测试询盘管理..."
    
    # 获取询盘列表
    local inquiry_response=$(curl -s -X GET \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE_URL/inquiries")
    
    if echo "$inquiry_response" | grep -q '"success":true'; then
        log_success "询盘列表获取测试通过"
    else
        log_error "询盘列表获取测试失败: $inquiry_response"
        return 1
    fi
    
    # 创建测试询盘
    local create_response=$(curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "API测试询盘",
            "content": "这是一个API测试创建的询盘",
            "customerName": "测试客户",
            "customerEmail": "test@example.com",
            "customerType": "enterprise",
            "sourceChannel": "website",
            "priority": "medium",
            "estimatedValue": 10000
        }' \
        "$API_BASE_URL/inquiries")
    
    if echo "$create_response" | grep -q '"success":true'; then
        log_success "询盘创建测试通过"
        # 提取询盘ID用于后续测试
        INQUIRY_ID=$(echo "$create_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    else
        log_error "询盘创建测试失败: $create_response"
        return 1
    fi
}

# 自定义字段测试
test_custom_fields() {
    log_info "测试自定义字段..."
    
    # 获取字段定义列表
    local fields_response=$(curl -s -X GET \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE_URL/custom-fields/definitions")
    
    if echo "$fields_response" | grep -q '"success":true'; then
        log_success "自定义字段列表获取测试通过"
    else
        log_error "自定义字段列表获取测试失败: $fields_response"
        return 1
    fi
    
    # 创建测试字段
    local create_field_response=$(curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "fieldName": "API测试字段",
            "fieldKey": "api_test_field",
            "fieldType": "text",
            "isRequired": false,
            "isSearchable": true,
            "displayOrder": 100,
            "description": "API测试创建的字段"
        }' \
        "$API_BASE_URL/custom-fields/definitions")
    
    if echo "$create_field_response" | grep -q '"success":true'; then
        log_success "自定义字段创建测试通过"
    else
        log_error "自定义字段创建测试失败: $create_field_response"
        return 1
    fi
}

# AI分析测试
test_ai_analysis() {
    log_info "测试AI分析..."
    
    if [ -z "$INQUIRY_ID" ]; then
        log_warning "跳过AI分析测试：没有可用的询盘ID"
        return 0
    fi
    
    # 获取AI分析历史
    local history_response=$(curl -s -X GET \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE_URL/ai/history/$INQUIRY_ID")
    
    if echo "$history_response" | grep -q '"success":true'; then
        log_success "AI分析历史获取测试通过"
    else
        log_error "AI分析历史获取测试失败: $history_response"
        return 1
    fi
    
    # 测试AI连接（不需要真实API密钥）
    local test_connection_response=$(curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "aiProvider": "openai",
            "apiKey": "test-key"
        }' \
        "$API_BASE_URL/ai/test-connection")
    
    if echo "$test_connection_response" | grep -q '"success":true'; then
        log_success "AI连接测试通过"
    else
        log_warning "AI连接测试失败（预期结果，因为使用测试密钥）"
    fi
}

# 跟进记录测试
test_follow_ups() {
    log_info "测试跟进记录..."
    
    # 获取跟进记录列表
    local followup_response=$(curl -s -X GET \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE_URL/follow-ups")
    
    if echo "$followup_response" | grep -q '"success":true'; then
        log_success "跟进记录列表获取测试通过"
    else
        log_error "跟进记录列表获取测试失败: $followup_response"
        return 1
    fi
    
    if [ -n "$INQUIRY_ID" ]; then
        # 创建测试跟进记录
        local create_followup_response=$(curl -s -X POST \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"inquiryId\": $INQUIRY_ID,
                \"followUpType\": \"phone\",
                \"content\": \"API测试跟进记录\",
                \"result\": \"interested\"
            }" \
            "$API_BASE_URL/follow-ups")
        
        if echo "$create_followup_response" | grep -q '"success":true'; then
            log_success "跟进记录创建测试通过"
        else
            log_error "跟进记录创建测试失败: $create_followup_response"
            return 1
        fi
    fi
}

# 统计报表测试
test_statistics() {
    log_info "测试统计报表..."
    
    # 获取仪表板数据
    local dashboard_response=$(curl -s -X GET \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE_URL/statistics/dashboard")
    
    if echo "$dashboard_response" | grep -q '"success":true'; then
        log_success "仪表板数据获取测试通过"
    else
        log_error "仪表板数据获取测试失败: $dashboard_response"
        return 1
    fi
    
    # 获取询盘统计
    local inquiry_stats_response=$(curl -s -X GET \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE_URL/statistics/inquiries")
    
    if echo "$inquiry_stats_response" | grep -q '"success":true'; then
        log_success "询盘统计获取测试通过"
    else
        log_error "询盘统计获取测试失败: $inquiry_stats_response"
        return 1
    fi
}

# 性能测试
test_performance() {
    log_info "测试系统性能..."
    
    # 获取健康检查数据
    local health_response=$(curl -s "${API_BASE_URL%/api}/health")
    
    if echo "$health_response" | grep -q '"status":"ok"'; then
        log_success "健康检查测试通过"
    else
        log_error "健康检查测试失败: $health_response"
        return 1
    fi
    
    # 获取性能指标
    local metrics_response=$(curl -s "${API_BASE_URL%/api}/metrics")
    
    if echo "$metrics_response" | grep -q '"security"'; then
        log_success "性能指标获取测试通过"
    else
        log_error "性能指标获取测试失败: $metrics_response"
        return 1
    fi
}

# 主测试函数
run_tests() {
    log_info "开始API测试..."
    echo "=================================="
    
    local failed_tests=0
    
    # 执行各项测试
    check_service || ((failed_tests++))
    test_auth || ((failed_tests++))
    test_users || ((failed_tests++))
    test_departments || ((failed_tests++))
    test_inquiries || ((failed_tests++))
    test_custom_fields || ((failed_tests++))
    test_ai_analysis || ((failed_tests++))
    test_follow_ups || ((failed_tests++))
    test_statistics || ((failed_tests++))
    test_performance || ((failed_tests++))
    
    echo "=================================="
    
    if [ $failed_tests -eq 0 ]; then
        log_success "所有API测试通过！"
        return 0
    else
        log_error "有 $failed_tests 个测试失败"
        return 1
    fi
}

# 清理函数
cleanup() {
    log_info "清理测试数据..."
    
    if [ -n "$TOKEN" ] && [ -n "$INQUIRY_ID" ]; then
        # 删除测试询盘
        curl -s -X DELETE \
            -H "Authorization: Bearer $TOKEN" \
            "$API_BASE_URL/inquiries/$INQUIRY_ID" > /dev/null
        log_info "测试询盘已删除"
    fi
}

# 脚本入口
main() {
    echo "AI询盘管理CRM系统 - API测试脚本"
    echo "=================================="
    
    # 设置清理陷阱
    trap cleanup EXIT
    
    # 运行测试
    if run_tests; then
        log_success "API测试完成！"
        exit 0
    else
        log_error "API测试失败！"
        exit 1
    fi
}

# 执行主函数
main "$@"
