"""
数据库初始化脚本
"""
from app.database import engine, Base, SessionLocal
from app.models import Patient, Visit, Recommendation, Feedback
from loguru import logger


def init_database():
    """初始化数据库"""
    logger.info("开始初始化数据库...")
    
    try:
        # 创建所有表
        Base.metadata.create_all(bind=engine)
        logger.info("✅ 数据库表创建成功")
        
        # 创建测试数据
        create_sample_data()
        
        logger.info("✅ 数据库初始化完成")
        
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}")
        raise


def create_sample_data():
    """创建示例数据"""
    db = SessionLocal()
    
    try:
        # 检查是否已有数据
        existing_patient = db.query(Patient).first()
        if existing_patient:
            logger.info("数据库已有数据,跳过示例数据创建")
            return
        
        logger.info("创建示例数据...")
        
        # 创建示例患者
        patients = [
            Patient(
                patient_id="P001",
                name="张三",
                gender="男",
                age=45,
                phone="13800138000"
            ),
            Patient(
                patient_id="P002",
                name="李四",
                gender="女",
                age=32,
                phone="13900139000"
            ),
            Patient(
                patient_id="P003",
                name="王五",
                gender="男",
                age=58,
                phone="13700137000"
            )
        ]
        
        for patient in patients:
            db.add(patient)
        
        db.commit()
        logger.info(f"✅ 创建了 {len(patients)} 个示例患者")
        
    except Exception as e:
        logger.error(f"创建示例数据失败: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_database()

