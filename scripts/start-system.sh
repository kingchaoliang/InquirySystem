#!/bin/bash

# 系统启动脚本
# 用于启动AI询盘管理CRM系统的所有服务

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

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

# 显示帮助信息
show_help() {
    echo "AI询盘管理CRM系统启动脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  dev         启动开发环境"
    echo "  prod        启动生产环境"
    echo "  docker      使用Docker启动"
    echo "  stop        停止所有服务"
    echo "  restart     重启所有服务"
    echo "  status      查看服务状态"
    echo "  logs        查看服务日志"
    echo "  test        运行系统测试"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 dev      # 启动开发环境"
    echo "  $0 docker   # 使用Docker启动"
    echo "  $0 test     # 运行系统测试"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        log_success "Node.js已安装: $node_version"
    else
        log_error "Node.js未安装，请先安装Node.js"
        return 1
    fi
    
    # 检查npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        log_success "npm已安装: $npm_version"
    else
        log_error "npm未安装"
        return 1
    fi
    
    # 检查Docker（如果需要）
    if [ "$1" = "docker" ]; then
        if command -v docker &> /dev/null; then
            log_success "Docker已安装"
        else
            log_error "Docker未安装，请先安装Docker"
            return 1
        fi
        
        if command -v docker-compose &> /dev/null; then
            log_success "Docker Compose已安装"
        else
            log_error "Docker Compose未安装"
            return 1
        fi
    fi
}

# 检查环境变量
check_environment() {
    log_info "检查环境配置..."
    
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warning ".env文件不存在，从.env.example复制..."
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            log_success ".env文件已创建"
        else
            log_error ".env.example文件不存在"
            return 1
        fi
    else
        log_success ".env文件存在"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装前端依赖
    log_info "安装前端依赖..."
    cd "$PROJECT_ROOT"
    if npm install; then
        log_success "前端依赖安装完成"
    else
        log_error "前端依赖安装失败"
        return 1
    fi
    
    # 安装后端依赖
    log_info "安装后端依赖..."
    cd "$BACKEND_DIR"
    if npm install; then
        log_success "后端依赖安装完成"
    else
        log_error "后端依赖安装失败"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    cd "$BACKEND_DIR"
    
    # 生成Prisma客户端
    log_info "生成Prisma客户端..."
    if npx prisma generate; then
        log_success "Prisma客户端生成完成"
    else
        log_error "Prisma客户端生成失败"
        return 1
    fi
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    if npx prisma migrate deploy; then
        log_success "数据库迁移完成"
    else
        log_warning "数据库迁移失败，可能是首次运行"
    fi
    
    # 运行种子数据
    log_info "运行种子数据..."
    if npm run seed; then
        log_success "种子数据运行完成"
    else
        log_warning "种子数据运行失败"
    fi
    
    cd "$PROJECT_ROOT"
}

# 启动开发环境
start_dev() {
    log_info "启动开发环境..."
    
    # 检查依赖
    check_dependencies || return 1
    check_environment || return 1
    
    # 安装依赖
    install_dependencies || return 1
    
    # 初始化数据库
    init_database || return 1
    
    # 启动后端服务
    log_info "启动后端服务..."
    cd "$BACKEND_DIR"
    npm run dev &
    BACKEND_PID=$!
    
    # 等待后端启动
    sleep 5
    
    # 启动前端服务
    log_info "启动前端服务..."
    cd "$PROJECT_ROOT"
    npm run dev &
    FRONTEND_PID=$!
    
    log_success "开发环境启动完成！"
    log_info "前端地址: http://localhost:8000"
    log_info "后端地址: http://localhost:3001"
    log_info "按 Ctrl+C 停止服务"
    
    # 等待用户中断
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
    wait
}

# 启动生产环境
start_prod() {
    log_info "启动生产环境..."
    
    # 检查依赖
    check_dependencies || return 1
    check_environment || return 1
    
    # 构建前端
    log_info "构建前端应用..."
    cd "$PROJECT_ROOT"
    if npm run build; then
        log_success "前端构建完成"
    else
        log_error "前端构建失败"
        return 1
    fi
    
    # 构建后端
    log_info "构建后端应用..."
    cd "$BACKEND_DIR"
    if npm run build; then
        log_success "后端构建完成"
    else
        log_error "后端构建失败"
        return 1
    fi
    
    # 初始化数据库
    init_database || return 1
    
    # 启动生产服务
    log_info "启动生产服务..."
    cd "$BACKEND_DIR"
    npm run start &
    BACKEND_PID=$!
    
    cd "$PROJECT_ROOT"
    npm run serve &
    FRONTEND_PID=$!
    
    log_success "生产环境启动完成！"
    log_info "应用地址: http://localhost:8000"
    
    # 等待用户中断
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
    wait
}

# 使用Docker启动
start_docker() {
    log_info "使用Docker启动系统..."
    
    # 检查Docker依赖
    check_dependencies "docker" || return 1
    check_environment || return 1
    
    cd "$PROJECT_ROOT"
    
    # 构建并启动服务
    log_info "构建Docker镜像..."
    if docker-compose build; then
        log_success "Docker镜像构建完成"
    else
        log_error "Docker镜像构建失败"
        return 1
    fi
    
    log_info "启动Docker服务..."
    if docker-compose up -d; then
        log_success "Docker服务启动完成"
    else
        log_error "Docker服务启动失败"
        return 1
    fi
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    docker-compose ps
    
    log_success "系统启动完成！"
    log_info "前端地址: http://localhost:8000"
    log_info "后端地址: http://localhost:3001"
    log_info "使用 'docker-compose logs -f' 查看日志"
    log_info "使用 'docker-compose down' 停止服务"
}

# 停止服务
stop_services() {
    log_info "停止所有服务..."
    
    # 停止Docker服务
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        docker-compose down
        log_success "Docker服务已停止"
    fi
    
    # 停止Node.js进程
    pkill -f "node.*dev" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    
    log_success "所有服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    stop_services
    sleep 2
    start_docker
}

# 查看服务状态
show_status() {
    log_info "查看服务状态..."
    
    cd "$PROJECT_ROOT"
    
    if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
        docker-compose ps
    else
        log_info "Docker Compose未运行"
    fi
    
    # 检查端口占用
    log_info "检查端口占用..."
    if command -v netstat &> /dev/null; then
        netstat -tlnp | grep -E ":(3001|8000|5432|6379)" || log_info "相关端口未被占用"
    elif command -v ss &> /dev/null; then
        ss -tlnp | grep -E ":(3001|8000|5432|6379)" || log_info "相关端口未被占用"
    fi
}

# 查看日志
show_logs() {
    log_info "查看服务日志..."
    
    cd "$PROJECT_ROOT"
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose logs -f
    else
        log_warning "Docker Compose未运行，无法查看日志"
    fi
}

# 运行测试
run_tests() {
    log_info "运行系统测试..."
    
    # 运行数据库测试
    if [ -f "$SCRIPT_DIR/test-database.sh" ]; then
        log_info "运行数据库测试..."
        bash "$SCRIPT_DIR/test-database.sh"
    fi
    
    # 运行API测试
    if [ -f "$SCRIPT_DIR/test-api.sh" ]; then
        log_info "运行API测试..."
        bash "$SCRIPT_DIR/test-api.sh"
    fi
    
    log_success "系统测试完成"
}

# 主函数
main() {
    case "${1:-help}" in
        "dev")
            start_dev
            ;;
        "prod")
            start_prod
            ;;
        "docker")
            start_docker
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "test")
            run_tests
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"
