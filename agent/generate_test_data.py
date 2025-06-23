#!/usr/bin/env python3
"""
生成近7天的测试数据脚本
按论文发布日期分布，每天约50篇相关论文
"""

import sys
import os
from datetime import datetime, date, timedelta
from dotenv import load_dotenv

# 添加path
sys.path.append('.')

from paperpulse.main import PaperPulseAgent
from paperpulse.supabase_client import SupabaseClient

def generate_test_data():
    """生成近7天的测试数据，按论文发布日期分布"""
    load_dotenv()
    
    print("🚀 开始生成近7天的测试数据...")
    print("=" * 60)
    
    try:
        agent = PaperPulseAgent()
        
        # 获取订阅者信息
        subscribers = agent.load_subscribers()
        if not subscribers:
            print("❌ 没有找到活跃订阅者")
            return
        
        target_subscriber = subscribers[0]  # qw2443@columbia.edu
        print(f"🎯 目标用户: {target_subscriber.email}")
        print(f"📋 关键词: {target_subscriber.keywords}")
        
        # 搜索大量论文（使用更长时间范围）
        print(f"\n🔍 搜索相关论文（时间范围: 30天）...")
        all_papers = []
        
        for keyword in target_subscriber.keywords:
            papers = agent.arxiv_client.search_papers(keyword, days_back=30)
            print(f"   {keyword}: {len(papers)} 篇")
            all_papers.extend(papers)
        
        # 去重
        seen_ids = set()
        unique_papers = []
        for paper in all_papers:
            if paper['id'] not in seen_ids:
                seen_ids.add(paper['id'])
                unique_papers.append(paper)
        
        print(f"\n📚 总共找到 {len(unique_papers)} 篇唯一论文")
        
        # 按发布日期分组
        papers_by_date = {}
        for paper in unique_papers:
            # 解析论文发布日期
            published_date = datetime.fromisoformat(paper['published'].replace('Z', '+00:00')).date()
            date_str = published_date.isoformat()
            
            if date_str not in papers_by_date:
                papers_by_date[date_str] = []
            papers_by_date[date_str].append(paper)
        
        print(f"\n📅 论文按日期分布:")
        for date_str in sorted(papers_by_date.keys(), reverse=True):
            print(f"   {date_str}: {len(papers_by_date[date_str])} 篇")
        
        # 生成近7天的数据
        today = date.today()
        
        for i in range(7):
            target_date = today - timedelta(days=i)
            target_date_str = target_date.isoformat()
            
            print(f"\n📝 处理日期: {target_date_str}")
            
            # 获取该日期的论文
            daily_papers = papers_by_date.get(target_date_str, [])
            
            if not daily_papers:
                print(f"   ❌ 该日期没有论文")
                continue
            
            # 限制每天最多50篇
            selected_papers = daily_papers[:50]
            print(f"   📄 选择 {len(selected_papers)} 篇论文")
            
            # 添加AI摘要
            print(f"   🤖 生成AI摘要...")
            try:
                selected_papers = agent.summarize_papers(
                    selected_papers, 
                    target_subscriber.summary_model, 
                    target_subscriber.tone
                )
            except Exception as e:
                print(f"   ⚠️  摘要生成失败: {e}")
            
            # 保存到数据库
            if agent.supabase:
                try:
                    # 保存论文到papers表
                    agent.supabase.save_papers(selected_papers)
                    
                    # 保存用户个性化digest记录（使用论文发布日期作为digest日期）
                    agent.supabase.save_user_digest(
                        email=target_subscriber.email,
                        date=target_date,  # 使用论文发布日期
                        keywords=target_subscriber.keywords,
                        papers=selected_papers,
                        sent_at=datetime.now(),
                        success=True,
                        user_id=target_subscriber.user_id
                    )
                    
                    print(f"   ✅ 已保存到数据库")
                    
                except Exception as e:
                    print(f"   ❌ 保存失败: {e}")
        
        print(f"\n🎉 测试数据生成完成!")
        print("=" * 60)
        
        # 验证结果
        print(f"\n🔍 验证生成的数据...")
        if agent.supabase:
            history = agent.supabase.get_user_digest_history(target_subscriber.email, days=7)
            print(f"用户digest历史记录: {len(history)} 条")
            for record in history:
                print(f"   {record['date']}: {record['papers_count']} 篇论文")
        
    except Exception as e:
        print(f"\n❌ 生成过程中出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    generate_test_data() 