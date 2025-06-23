#!/usr/bin/env python3
"""
生产环境推送测试脚本
模拟完整的daily digest推送流程，然后清理测试数据
"""

import uuid
import sys
import os
from datetime import datetime, date
from pathlib import Path

# 添加agent路径
sys.path.append('./agent')

from agent.paperpulse.main import PaperPulseAgent
from agent.paperpulse.supabase_client import SupabaseClient
from dotenv import load_dotenv

def test_production_push():
    """测试生产环境推送流程"""
    load_dotenv('./agent/.env')
    
    print("🚀 开始生产环境推送测试")
    print("=" * 50)
    
    client = None
    test_subscription_id = None
    
    try:
        # 1. 创建测试订阅
        print("\n📧 1. 创建测试订阅...")
        client = SupabaseClient()
        test_subscription_id = str(uuid.uuid4())
        
        test_subscription = {
            'id': test_subscription_id,
            'email': 'production.test@example.com',
            'keywords': ['artificial intelligence', 'machine learning'],  # 更通用的关键词
            'digest_time': '13:00',
            'max_papers': 3,  # 限制论文数量
            'summary_model': 'llama-3.1-8b-instant-groq',
            'tone': 'concise',
            'include_pdf_link': True,
            'active': True
        }
        
        response = client.client.table('subscriptions').upsert([test_subscription]).execute()
        print(f"   ✅ 创建测试订阅: {test_subscription['email']}")
        print(f"      关键词: {test_subscription['keywords']}")
        
        # 2. 检查当前所有订阅
        print("\n📋 2. 当前活跃订阅列表:")
        agent = PaperPulseAgent()
        subscribers = agent.load_subscribers()
        
        for i, sub in enumerate(subscribers, 1):
            print(f"   {i}. {sub.email}")
            print(f"      关键词: {sub.keywords}")
            print(f"      最大论文数: {sub.max_papers}")
        
        # 3. 搜索论文（扩展时间范围以确保有结果）
        print(f"\n🔍 3. 搜索论文 (时间范围: 3天)...")
        all_keywords = list(set(kw for sub in subscribers for kw in sub.keywords))
        print(f"   搜索关键词: {all_keywords}")
        
        # 临时修改搜索范围以获取一些论文
        papers_dict = {}
        for keyword in all_keywords:
            papers = agent.arxiv_client.search_papers(keyword, days_back=3)  # 扩展到3天
            papers_dict[keyword] = papers
            print(f"   {keyword}: {len(papers)} 篇论文")
        
        total_papers = sum(len(papers) for papers in papers_dict.values())
        print(f"   📚 总共找到 {total_papers} 篇论文")
        
        if total_papers == 0:
            print("   ⚠️  没有找到论文，扩展搜索范围到7天...")
            for keyword in all_keywords:
                papers = agent.arxiv_client.search_papers(keyword, days_back=7)
                papers_dict[keyword] = papers
                print(f"   {keyword}: {len(papers)} 篇论文")
            total_papers = sum(len(papers) for papers in papers_dict.values())
            print(f"   📚 扩展搜索后总共找到 {total_papers} 篇论文")
        
        # 4. 模拟digest生成和保存
        print(f"\n💾 4. 生成今日digest...")
        if total_papers > 0:
            # 收集唯一论文
            all_papers = []
            seen_ids = set()
            for papers in papers_dict.values():
                for paper in papers:
                    if paper['id'] not in seen_ids:
                        seen_ids.add(paper['id'])
                        all_papers.append(paper)
            
            # 保存digest（限制在前10篇）
            today_papers = all_papers[:10]
            success = agent.save_daily_digest(today_papers)
            print(f"   📝 Digest保存: {'成功' if success else '失败'}")
            print(f"   📄 保存论文数: {len(today_papers)}")
            
            # 显示今日digest文件
            digest_file = agent.digest_output_dir / f"{date.today().isoformat()}.json"
            if digest_file.exists():
                print(f"   📁 Digest文件: {digest_file}")
            
        # 5. 实际发送邮件测试（仅针对测试订阅）
        print(f"\n📨 5. 发送测试邮件...")
        test_subscriber = next((sub for sub in subscribers if sub.email == 'production.test@example.com'), None)
        
        if test_subscriber and total_papers > 0:
            print(f"   🎯 向 {test_subscriber.email} 发送测试邮件...")
            
            # 处理测试订阅者
            result = agent.process_subscriber(test_subscriber)
            
            print(f"   📧 邮件发送结果:")
            print(f"      收件人: {result.subscriber_email}")
            print(f"      论文数: {result.papers_count}")
            print(f"      成功: {result.success}")
            if result.error:
                print(f"      错误: {result.error}")
        else:
            print("   ⚠️  跳过邮件发送 (无论文或无测试订阅)")
        
        print(f"\n✅ 测试完成!")
        
    except Exception as e:
        print(f"\n❌ 测试过程中出错: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # 6. 清理测试数据
        print(f"\n🧹 6. 清理测试数据...")
        try:
            if client and test_subscription_id:
                client.client.table('subscriptions').delete().eq('id', test_subscription_id).execute()
                print("   ✅ 测试订阅已删除")
                
            # 删除今日的测试digest文件
            digest_file = Path("./web/public/static/digests") / f"{date.today().isoformat()}.json"
            if digest_file.exists():
                digest_file.unlink()
                print("   ✅ 测试digest文件已删除")
                
        except Exception as e:
            print(f"   ⚠️  清理时出错: {e}")
        
        print(f"\n🎉 测试流程结束")
        print("=" * 50)

if __name__ == "__main__":
    test_production_push() 