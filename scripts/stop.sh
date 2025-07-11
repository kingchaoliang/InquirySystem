#!/bin/bash

# AI询盘管理CRM系统停止脚本

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

# 停止Docker服务
stop_docker_services() {
    print_message "停止Docker服务..." $BLUE
    
    if [ -f docker-compose.yml ]; then
        docker-compose down
        print_message "Docker服务已停止" $GREEN
    else
        print_message "未找到docker-compose.yml文件" $YELLOW
    fi
}

# 停止本地开发服务器
stop_dev_servers() {
    print_message "停止本地开发服务器..." $BLUE
    
    # 查找并停止Node.js进程
    PIDS=$(pgrep -f "node.*dev" || true)
    if [ ! -z "$PIDS" ]; then
        echo $PIDS | xargs kill -TERM
        print_message "已停止Node.js开发服务器" $GREEN
    else
        print_message "未找到运行中的Node.js开发服务器" $YELLOW
    fi
    
    # 查找并停止UmiJS进程
    PIDS=$(pgrep -f "umi.*dev" || true)
    if [ ! -z "$PIDS" ]; then
        echo $PIDS | xargs kill -TERM
        print_message "已停止UmiJS开发服务器" $GREEN
    else
        print_message "未找到运行中的UmiJS开发服务器" $YELLOW
    fi
}

# 清理Docker资源
cleanup_docker() {
    print_message "清理Docker资源..." $BLUE
    
    # 停止所有相关容器
    docker ps -a --filter "name=inquiry-crm" --format "{{.ID}}" | xargs -r docker stop
    
    # 删除所有相关容器
    docker ps -a --filter "name=inquiry-crm" --format "{{.ID}}" | xargs -r docker rm
    
    print_message "Docker资源清理完成" $GREEN
}

# 显示帮助信息
show_help() {
    echo "AI询盘管理CRM系统停止脚本"
    echo ""
    echo "使用方法:"
    echo "  ./scripts/stop.sh        - 停止所有服务"
    echo "  ./scripts/stop.sh dev    - 停止开发服务器"
    echo "  ./scripts/stop.sh docker - 停止Docker服务"
    echo "  ./scripts/stop.sh clean  - 停止并清理所有Docker资源"
    echo "  ./scripts/stop.sh help   - 显示帮助信息"
}

# 主函数
main() {
    print_message "AI询盘管理CRM系统停止脚本" $BLUE
    print_message "================================" $BLUE
    
    case "${1:-all}" in
        "all")
            stop_dev_servers
            stop_docker_services
            print_message "所有服务已停止" $GREEN
            ;;
        "dev")
            stop_dev_servers
            ;;
        "docker")
            stop_docker_services
            ;;
        "clean")
            stop_dev_servers
            stop_docker_services
            cleanup_docker
            print_message "所有服务已停止并清理完成" $GREEN
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
