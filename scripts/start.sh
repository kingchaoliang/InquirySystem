#!/bin/bash

# AI询盘管理CRM系统启动脚本
# 使用方法: ./scripts/start.sh [dev|prod]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_message "错误: Docker未安装，请先安装Docker" $RED
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_message "错误: Docker Compose未安装，请先安装Docker Compose" $RED
        exit 1
    fi
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f .env ]; then
        print_message "警告: .env文件不存在，正在从.env.example复制..." $YELLOW
        cp .env.example .env
        print_message "请编辑.env文件配置必要的环境变量" $YELLOW
    fi
}

# 启动开发环境
start_dev() {
    print_message "启动开发环境..." $BLUE
    
    # 启动数据库和Redis
    print_message "启动数据库和Redis..." $BLUE
    docker-compose up -d mysql redis
    
    # 等待数据库启动
    print_message "等待数据库启动..." $YELLOW
    sleep 10
    
    # 安装后端依赖
    print_message "安装后端依赖..." $BLUE
    cd backend
    npm install
    
    # 生成Prisma客户端
    print_message "生成Prisma客户端..." $BLUE
    npx prisma generate
    
    # 运行数据库迁移
    print_message "运行数据库迁移..." $BLUE
    npx prisma migrate dev --name init
    
    # 启动后端开发服务器
    print_message "启动后端开发服务器..." $BLUE
    npm run dev &
    BACKEND_PID=$!
    
    cd ..
    
    # 安装前端依赖
    print_message "安装前端依赖..." $BLUE
    npm install
    
    # 启动前端开发服务器
    print_message "启动前端开发服务器..." $BLUE
    npm run dev &
    FRONTEND_PID=$!
    
    print_message "开发环境启动完成!" $GREEN
    print_message "前端地址: http://localhost:8000" $GREEN
    print_message "后端地址: http://localhost:3001" $GREEN
    print_message "数据库管理: npx prisma studio" $GREEN
    
    # 等待用户中断
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
    wait
}

# 启动生产环境
start_prod() {
    print_message "启动生产环境..." $BLUE
    
    # 构建并启动所有服务
    docker-compose up -d --build
    
    # 等待服务启动
    print_message "等待服务启动..." $YELLOW
    sleep 30
    
    # 运行数据库迁移
    print_message "运行数据库迁移..." $BLUE
    docker-compose exec backend npx prisma migrate deploy
    
    print_message "生产环境启动完成!" $GREEN
    print_message "应用地址: http://localhost:80" $GREEN
    print_message "查看日志: docker-compose logs -f" $GREEN
    print_message "停止服务: docker-compose down" $GREEN
}

# 显示帮助信息
show_help() {
    echo "AI询盘管理CRM系统启动脚本"
    echo ""
    echo "使用方法:"
    echo "  ./scripts/start.sh dev   - 启动开发环境"
    echo "  ./scripts/start.sh prod  - 启动生产环境"
    echo "  ./scripts/start.sh help  - 显示帮助信息"
    echo ""
    echo "开发环境:"
    echo "  - 使用Docker启动数据库和Redis"
    echo "  - 本地运行前端和后端开发服务器"
    echo "  - 支持热重载和调试"
    echo ""
    echo "生产环境:"
    echo "  - 使用Docker Compose启动所有服务"
    echo "  - 包含Nginx反向代理"
    echo "  - 适用于生产部署"
}

# 主函数
main() {
    print_message "AI询盘管理CRM系统启动脚本" $BLUE
    print_message "================================" $BLUE
    
    # 检查Docker
    check_docker
    
    # 检查环境变量文件
    check_env_file
    
    # 根据参数执行相应操作
    case "${1:-dev}" in
        "dev")
            start_dev
            ;;
        "prod")
            start_prod
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_message "错误: 未知参数 '$1'" $RED
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
