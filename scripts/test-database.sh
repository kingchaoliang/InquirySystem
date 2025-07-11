#!/bin/bash

# 数据库测试脚本
# 用于测试PostgreSQL数据库连接和基本操作

set -e

# 配置
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="inquiry_crm"
DB_USER="crm_user"
DB_PASSWORD="crm_password"

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

# 检查PostgreSQL是否安装
check_postgresql() {
    log_info "检查PostgreSQL安装..."
    
    if command -v psql &> /dev/null; then
        log_success "PostgreSQL客户端已安装"
        psql --version
    else
        log_error "PostgreSQL客户端未安装"
        return 1
    fi
}

# 检查数据库连接
check_connection() {
    log_info "检查数据库连接..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_success "数据库连接成功"
    else
        log_error "数据库连接失败"
        log_info "请确保PostgreSQL服务正在运行，并且数据库配置正确"
        return 1
    fi
}

# 检查数据库表结构
check_tables() {
    log_info "检查数据库表结构..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # 期望的表列表
    local expected_tables=(
        "users"
        "departments"
        "inquiries"
        "custom_field_definitions"
        "user_custom_field_configs"
        "follow_up_records"
        "ai_analysis_records"
        "system_configs"
        "operation_logs"
    )
    
    local missing_tables=()
    
    for table in "${expected_tables[@]}"; do
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
           -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" \
           | grep -q "1 row"; then
            log_success "表 $table 存在"
        else
            log_error "表 $table 不存在"
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        log_success "所有必需的表都存在"
    else
        log_error "缺少以下表: ${missing_tables[*]}"
        return 1
    fi
}

# 检查表数据
check_data() {
    log_info "检查表数据..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # 检查用户表
    local user_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                      -t -c "SELECT COUNT(*) FROM users;")
    log_info "用户表记录数: $user_count"
    
    # 检查部门表
    local dept_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                      -t -c "SELECT COUNT(*) FROM departments;")
    log_info "部门表记录数: $dept_count"
    
    # 检查询盘表
    local inquiry_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                         -t -c "SELECT COUNT(*) FROM inquiries;")
    log_info "询盘表记录数: $inquiry_count"
    
    if [ "$user_count" -gt 0 ] && [ "$dept_count" -gt 0 ]; then
        log_success "基础数据检查通过"
    else
        log_warning "基础数据可能不完整，请检查种子数据"
    fi
}

# 测试基本CRUD操作
test_crud_operations() {
    log_info "测试基本CRUD操作..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # 创建测试部门
    log_info "测试创建操作..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -c "INSERT INTO departments (name, description, level, path, status) 
             VALUES ('测试部门', '数据库测试部门', 1, '/test', 'active');" &> /dev/null
    
    if [ $? -eq 0 ]; then
        log_success "创建操作测试通过"
    else
        log_error "创建操作测试失败"
        return 1
    fi
    
    # 查询测试部门
    log_info "测试查询操作..."
    local test_dept_id=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                        -t -c "SELECT id FROM departments WHERE name = '测试部门';")
    
    if [ -n "$test_dept_id" ]; then
        log_success "查询操作测试通过"
    else
        log_error "查询操作测试失败"
        return 1
    fi
    
    # 更新测试部门
    log_info "测试更新操作..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -c "UPDATE departments SET description = '更新后的测试部门' WHERE name = '测试部门';" &> /dev/null
    
    if [ $? -eq 0 ]; then
        log_success "更新操作测试通过"
    else
        log_error "更新操作测试失败"
        return 1
    fi
    
    # 删除测试部门
    log_info "测试删除操作..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -c "DELETE FROM departments WHERE name = '测试部门';" &> /dev/null
    
    if [ $? -eq 0 ]; then
        log_success "删除操作测试通过"
    else
        log_error "删除操作测试失败"
        return 1
    fi
}

# 测试索引性能
test_indexes() {
    log_info "测试数据库索引..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # 检查重要表的索引
    local index_check=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                       -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename IN ('users', 'inquiries', 'departments');")
    
    log_info "重要表的索引数量: $index_check"
    
    if [ "$index_check" -gt 10 ]; then
        log_success "索引配置检查通过"
    else
        log_warning "索引数量可能不足，请检查索引配置"
    fi
}

# 测试外键约束
test_foreign_keys() {
    log_info "测试外键约束..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # 检查外键约束数量
    local fk_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                    -t -c "SELECT COUNT(*) FROM information_schema.table_constraints 
                           WHERE constraint_type = 'FOREIGN KEY';")
    
    log_info "外键约束数量: $fk_count"
    
    if [ "$fk_count" -gt 5 ]; then
        log_success "外键约束检查通过"
    else
        log_warning "外键约束可能不完整"
    fi
}

# 测试数据库性能
test_performance() {
    log_info "测试数据库性能..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # 测试简单查询性能
    local start_time=$(date +%s%N)
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -c "SELECT COUNT(*) FROM users;" &> /dev/null
    local end_time=$(date +%s%N)
    
    local duration=$(( (end_time - start_time) / 1000000 )) # 转换为毫秒
    log_info "简单查询耗时: ${duration}ms"
    
    if [ "$duration" -lt 100 ]; then
        log_success "查询性能良好"
    else
        log_warning "查询性能可能需要优化"
    fi
}

# 检查数据库配置
check_database_config() {
    log_info "检查数据库配置..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # 检查最大连接数
    local max_connections=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                           -t -c "SHOW max_connections;")
    log_info "最大连接数: $max_connections"
    
    # 检查共享缓冲区
    local shared_buffers=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                          -t -c "SHOW shared_buffers;")
    log_info "共享缓冲区: $shared_buffers"
    
    # 检查工作内存
    local work_mem=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                    -t -c "SHOW work_mem;")
    log_info "工作内存: $work_mem"
}

# 主测试函数
run_tests() {
    log_info "开始数据库测试..."
    echo "=================================="
    
    local failed_tests=0
    
    # 执行各项测试
    check_postgresql || ((failed_tests++))
    check_connection || ((failed_tests++))
    check_tables || ((failed_tests++))
    check_data || ((failed_tests++))
    test_crud_operations || ((failed_tests++))
    test_indexes || ((failed_tests++))
    test_foreign_keys || ((failed_tests++))
    test_performance || ((failed_tests++))
    check_database_config || ((failed_tests++))
    
    echo "=================================="
    
    if [ $failed_tests -eq 0 ]; then
        log_success "所有数据库测试通过！"
        return 0
    else
        log_error "有 $failed_tests 个测试失败"
        return 1
    fi
}

# 脚本入口
main() {
    echo "AI询盘管理CRM系统 - 数据库测试脚本"
    echo "=================================="
    
    # 运行测试
    if run_tests; then
        log_success "数据库测试完成！"
        exit 0
    else
        log_error "数据库测试失败！"
        exit 1
    fi
}

# 执行主函数
main "$@"
