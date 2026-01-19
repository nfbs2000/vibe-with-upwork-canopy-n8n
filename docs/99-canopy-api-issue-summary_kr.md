# **Canopy Tax CRM API 기반 자동화 체계 구축 및 n8n-Solapi 연동을 통한 문서 감지 프로세스 혁신 보고서**

편집자 노트: 이 문서의 핵심 요지는 `docs/02-implementation-plan.md`에 반영되었습니다.

세무 및 회계 산업의 디지털 전환은 단순한 데이터의 전산화를 넘어, 고객과의 상호작용을 자동화하고 업무의 지연 시간을 최소화하는 방향으로 진화하고 있다. 이러한 흐름 속에서 Canopy Tax CRM은 강력한 문서 관리 및 고객 관계 관리 기능을 제공하며 시장의 핵심 솔루션으로 자리 잡았다. 그러나 기업이 자체적인 워크플로우를 구축하기 위해 Canopy의 외부 API를 활용하려 할 때, 시스템의 폐쇄성과 데이터 노출 범위의 한계라는 기술적 장벽에 직면하게 된다. 특히 고객의 파일 업로드를 실시간으로 감지하고 이를 외부 통신망과 연결하는 과정은 단순한 API 호출만으로는 해결되지 않는 복잡한 아키텍처 설계를 요구한다. 본 보고서는 Canopy Public API v3의 기술적 명세와 한계를 정밀하게 분석하고, 이를 극복하기 위한 커스텀 필드 상태 머신 전략 및 n8n의 비동기 대기 노드 메커니즘을 상세히 제안한다. 또한, 한국 시장의 특수성을 고려하여 Solapi를 통한 카카오 알림톡 발송 체계를 결합함으로써, 세무 대리인과 고객 간의 단절 없는 커뮤니케이션 인프라를 구축하는 방안을 전문적인 관점에서 서술한다.

## **Canopy Tax Public API v3의 구조적 특성과 파일 관리의 기술적 한계**

Canopy Tax CRM의 생태계는 크게 사용자 인터페이스(UI)를 통한 내부 작업 영역과 외부 시스템과의 연동을 위한 Public API v3로 구분된다.1 내부 워크스페이스에서는 서명 감지, OCR 기능을 포함한 고급 문서 관리 시스템(DMS)이 작동하며, TIFF, PDF, Excel 등 다양한 확장자를 지원하는 강력한 파일 핸들링 능력을 보여준다.3 그러나 외부 개발자를 위해 제공되는 Public API v3는 이와 대조적으로 엄격하게 제한된 데이터 스코프를 유지하고 있다. API의 주요 엔드포인트는 클라이언트의 기본 인적 사항, 연락처 정보, 클라이언트 상태(Prospect, Active, Inactive, Archived), 그리고 비즈니스 유형 분류에 집중되어 있다.1

가장 결정적인 한계는 파일 및 문서 엔드포인트의 부재이다. Public API v3 명세를 기술적으로 검토한 결과, 특정 클라이언트의 프로필에 업로드된 파일 목록을 조회하거나 파일의 존재 여부를 확인할 수 있는 직접적인 API 호출 방식이 존재하지 않음이 확인되었다.1 또한, 새로운 파일이 업로드되는 사건(Event)을 실시간으로 외부 시스템에 전달하는 아웃바운드 웹훅(Outbound Webhook) 기능 역시 공식적으로 지원되지 않는다.5 이는 "사용자가 자료를 올렸다"는 행위를 외부 자동화 도구인 n8n이나 Zapier가 인지할 수 있는 직접적인 경로가 차단되어 있음을 의미한다. 아울러 미수금 데이터(AR)와 같은 민감한 재무 정보 역시 API 접근 범위에서 제외되어 있어, 전방위적인 자동화 구축을 위해서는 데이터의 불투명성을 해소할 수 있는 우회 전략이 필수적이다.1

| 구분 | 지원되는 기능 및 데이터 | 지원되지 않는 한계점 |
| :---- | :---- | :---- |
| **기본 데이터** | 클라이언트 이름, 생년월일, 전화번호, 이메일, 주소 1 | 계정 수준의 재무 데이터(AR) 접근 불가 1 |
| **식별자** | 클라이언트 GUID, External ID 6 | CRM 1 버전 계정의 API 사용 제한 1 |
| **상태 관리** | 클라이언트 상태값 및 비즈니스 유형 분류 1 | 실시간 상태 변경 알림 웹훅 부재 5 |
| **확장성** | 사용자 정의 커스텀 필드(Custom Fields) 지원 6 | 파일 목록 조회 및 다운로드 API 엔드포인트 부재 1 |
| **작업 관리** | UI 내 클라이언트 요청 및 작업 생성 기능 7 | 작업(Task) 및 요청(Request)의 API 제어 불가 1 |

이러한 제약 조건은 Canopy의 아키텍처가 철저하게 데이터 보안과 권한 관리(RBAC)에 기반하고 있기 때문에 발생한다. 모든 API 요청은 HTTPS 환경에서 수행되어야 하며, 토큰 기반 인증 또는 시스템 계정 키(UUID)를 통한 엄격한 검증을 거친다.8 따라서 문서 데이터와 같이 보안 등급이 높은 정보에 대해서는 API를 통한 무분별한 접근을 차단하고, 내부 시스템의 자동화 규칙(Automation Rules)만을 통해 제한적으로 처리하도록 설계되어 있다.9

## **커스텀 필드 상태 머신 기반의 문서 감지 우회 전략**

Canopy API의 파일 조회 기능 부재를 해결하기 위한 기술적 해결책은 CRM의 확장성 모델인 '커스텀 필드(Custom Fields)'를 활용하는 것이다. 클라이언트 프로필에 File\_Upload\_Status 또는 Upload\_Flag와 같은 사용자 정의 필드를 생성하고, 이를 자동화 시스템이 감시할 수 있는 '상태 대리자(Status Proxy)'로 활용하는 방식이다.11 이 전략은 데이터의 투명성을 확보함과 동시에 n8n과 같은 외부 오케스트레이션 도구가 결정론적(Deterministic)으로 동작할 수 있는 근거를 제공한다.

상태 머신 구현의 첫 번째 단계는 Canopy 설정 메뉴에서 'Dropdown Select' 또는 'Text Input' 유형의 커스텀 필드를 정의하는 것이다.11 드롭다운 유형을 사용할 경우 'Pending', 'Uploaded', 'Review Completed'와 같이 명확한 상태 전이를 정의할 수 있어 데이터 무결성 유지에 유리하다.11 클라이언트가 UI의 포털을 통해 자료를 제출하거나 세무 대리인이 직접 파일을 업로드한 후, 내부 프로세스에 따라 이 필드 값을 'Uploaded'로 변경하게 된다. 만약 Canopy 내부의 자동화 규칙이 특정 문서 요청(Client Request)의 완료 상태를 감지하여 커스텀 필드를 자동으로 업데이트할 수 있다면 가장 이상적이나, 현재의 시스템 명세상 이는 담당자의 수동 조작이나 내부 상태 변경에 따른 간접적인 갱신을 동반할 가능성이 높다.5

n8n은 Canopy에서 발송되는 **알림 이메일**을 트리거로 삼아, 고객 프로필의 상태 변화를 감지한다. 이메일 본문에서 고객 식별자(예: client\_id, 이메일, 이름)를 추출한 뒤, `GET /public/v3/clients/{id}`로 상세 정보를 조회하고 custom\_fields 값을 검사한다. 이 방식은 실제 파일 바이너리에 접근하지 않고도 "문서가 존재한다"는 비즈니스 로직상의 신호를 획득할 수 있게 해준다.

| 필드 구성 요소 | 설정값 및 유형 | 자동화 로직에서의 역할 |
| :---- | :---- | :---- |
| **필드 이름** | File\_Upload\_Status 11 | n8n 검색 및 필터링을 위한 고유 식별자 |
| **데이터 유형** | Dropdown Select 12 | 상태값의 고정(Pending, Uploaded, Done)으로 오류 방지 |
| **적용 대상** | Individual / Business Clients 1 | 전사 클라이언트 데이터 모델에 표준화 적용 |
| **접근 권한** | Team Member / Admin 1 | 데이터의 임의 수정을 방지하고 신뢰성 확보 |

이 우회 전략의 핵심적인 통찰은 API가 제공하지 않는 '사건(Event)'을 '상태(State)'의 변화로 치환하는 데 있다. 이는 시스템 간의 결합도를 낮추면서도 Canopy가 향후 파일 관련 API를 공식 출시했을 때 최소한의 수정만으로 로직을 이전할 수 있는 유연성을 제공한다.15

## **n8n 이메일 트리거 기반 오케스트레이션**

n8n은 Canopy CRM과 외부 알림 시스템을 연결하는 중앙 제어 장치로서, **Canopy 알림 이메일을 실질적인 이벤트 신호**로 활용한다. Canopy Public API v3에 아웃바운드 웹훅이 없기 때문에, 이메일 알림을 수신해 즉시 워크플로우를 시작하는 구조가 현실적이다.

전체적인 워크플로우는 다음과 같은 노드 체인으로 구성된다. 먼저 **Gmail Trigger**가 Canopy 알림 메일을 감지한다. 이후 **Email Parse** 노드가 본문에서 client\_id, 이메일, 이름 등을 추출한다. client\_id가 없다면 `GET /public/v3/clients/search`로 식별자를 보정하고, `GET /public/v3/clients/:id`로 상세 정보를 조회한다. 필요 시 **Wait** 노드로 승인 대기 후 Solapi 알림톡 또는 이메일 발송으로 이어지며, 커스텀 필드는 내부 상태 관리용으로 선택적으로 활용한다.

이 방식은 Canopy API 호출량을 줄이면서도 폴링 대비 빠른 반응성을 확보할 수 있다. 다만 이메일 포맷 변경에 대비해 파싱 규칙을 안정적으로 관리해야 한다.

| n8n 노드 기능 | 상세 설정 및 활용 | 비즈니스 로직 기여 |
| :---- | :---- | :---- |
| **Gmail Trigger** | sender/subject 필터 | 이메일 기반 이벤트 트리거 |
| **Email Parse** | 본문에서 client\_id/이메일/이름 추출 | 식별자 확보 |
| **Search (옵션)** | `GET /clients/search` | 식별자 보정 |
| **HTTP Request (Detail)** | `GET /clients/:id` | 연락처/상태 조회 |
| **Wait (옵션)** | 승인 신호 대기 | 후속 실행 제어 |
| **Notification** | Solapi/Email 발송 | 고객/담당자 알림 |

이 과정에서 n8n이 분산 환경(Queue Mode)으로 운영될 경우, 워커 노드 간의 상태 공유가 중요하다. Gmail 트리거 실행과 승인 대기(Wait) 상태를 공유 DB(Postgres 등)에 저장하여 중복 실행이나 누락을 방지해야 한다.

## **Solapi 연동을 통한 카카오 알림톡 및 다중 채널 알림 체계**

검증된 데이터와 승인 신호가 준비되면, 최종적으로 고객이나 담당자에게 알림을 전달하는 단계에 진입한다. 한국의 비즈니스 환경에서 이메일보다 높은 확인율을 보이고 신뢰성을 담보하는 채널은 카카오 알림톡이다. Solapi는 이러한 카카오톡 기반 알림 메시지를 REST API를 통해 간편하게 발송할 수 있도록 돕는 통신 게이트웨이 역할을 수행한다.29 알림톡은 정보성 메시지에 한해 발송이 가능하며, 사전에 카카오의 심사를 통과한 템플릿만을 사용할 수 있다는 정책적 특성이 있다.31

n8n 워크플로우에서 Solapi와의 연동은 다시 한번 'HTTP Request' 노드를 통해 이루어진다. 발송 엔드포인트는 https://api.solapi.com/messages/v4/send이며, 요청 바디에는 수신번호, 발신번호, 그리고 템플릿에 정의된 변수값들이 포함된 JSON 객체가 담긴다.33 특히 Solapi는 알림톡 발송 실패 시 일반 SMS나 LMS로 자동 전환하여 메시지를 재전송하는 '대체 발송(Fail-over)' 기능을 지원하여 통신 환경의 불확실성을 상쇄한다.35

템플릿 기반 발송 시 주의해야 할 점은 Canopy에서 획득한 데이터가 Solapi의 변수 형식과 정확히 일치해야 한다는 것이다. 예를 들어, 클라이언트의 이름이나 업로드된 서류의 종류 등을 알림톡 내용에 포함하려면 n8n의 식(Expression) 기능을 사용하여 JSON 구조 내의 적절한 위치에 데이터를 매핑해야 한다.20 또한, 야간 시간대 발송 제한 정책(친구톡의 경우 08시\~21시 제한 등)을 준수하기 위해 n8n의 시간 판별 로직을 추가하여 메시지 발송 시점을 조정하는 설계가 권장된다.37

JSON

{  
  "messages": \[  
    {  
      "to": "01012345678",  
      "from": "021234567",  
      "text": "\[대박세무법인\] 안녕하세요, 홍길동 고객님. 요청하신 소득세 관련 서류가 정상적으로 접수되었습니다.",  
      "kakaoOptions": {  
        "pfId": "KA01PF210512032115",  
        "templateId": "UPLOAD\_NOTIFY\_V1",  
        "variables": {  
          "\#{이름}": "홍길동",  
          "\#{서류명}": "소득증명원"  
        }  
      }  
    }  
  \]  
}

이러한 다중 채널 알림 체계는 단순히 정보를 전달하는 것을 넘어, 고객에게 업무의 진행 상황을 실시간으로 공유함으로써 서비스의 전문성을 높이는 효과를 가져온다. 만약 이메일 알림이 필요한 경우, n8n의 'Send Email' 노드를 사용하여 SMTP 방식이나 Gmail API 연동을 통해 커스터마이징된 HTML 이메일을 발송할 수도 있다.39 Canopy 내부의 이메일 기능이 템플릿 수정에 제약이 있는 것과 달리, n8n을 통한 이메일 발송은 외부 데이터베이스나 이전 노드의 결과를 무제한으로 결합할 수 있다는 장점이 있다.10

## **시스템 운영 안정성 및 보안 아키텍처 최적화**

자동화 시스템이 실무 환경에서 안정적으로 작동하기 위해서는 인프라 수준에서의 세밀한 튜닝이 뒷받침되어야 한다. Canopy API와 Solapi 모두 호출 횟수 제한(Rate Limit)을 적용하고 있으므로, 이메일 신호 이후 불필요한 대량 호출이 발생하지 않도록 주의해야 한다.2 Canopy의 경우 특정 인증 방식에 대해 24시간당 50회의 요청 제한이 있을 수 있으며, 이를 초과할 경우 429 Too Many Requests 또는 시스템 오류 코드가 반환될 수 있다.42 따라서 n8n에서는 'Retry on Fail' 설정을 통해 일시적인 네트워크 오류에 대응하고, 이메일 트리거 후 최소 호출로 필요한 데이터만 조회하는 방식이 권장된다.43

보안 측면에서는 API Key와 Secret Key, 그리고 Gmail 계정 접근 권한의 관리가 최우선 과제다. n8n은 자격 증명(Credentials) 관리 기능을 통해 민감 정보를 워크플로우 로직과 분리하여 안전하게 암호화 보관한다.34 또한, Gmail 계정에 대한 2FA 및 앱 비밀번호 정책을 적용하고, n8n UI 접근을 제한하며 네트워크 방화벽 또는 VPN을 적용해 허가되지 않은 외부 접근을 차단해야 한다.

| 보안 요소 | 적용 기술 및 방법 | 효과 |
| :---- | :---- | :---- |
| **자격 증명 보호** | n8n Credentials Encryption 44 | API 키 유출 방지 및 중앙 집중 관리 |
| **접근 제어** | n8n UI 접근 제한 및 네트워크 차단 | 비인가 접근 차단 |
| **데이터 무결성** | HMAC Signature Verification 8 | 요청의 진위 여부 확인 및 위변조 방지 |
| **실행 격리** | n8n Queue Mode \+ Persistent DB 28 | 고부하 환경에서의 안정적인 상태 유지 |
| **감사 추적** | n8n Execution History & Logs 46 | 장애 발생 시 원인 분석 및 이력 확인 가능 |

성능 최적화 관점에서는 Canopy의 GET /clients 호출 시 대량의 데이터를 한꺼번에 가져오기보다, 필요한 클라이언트 ID만을 타겟팅하여 호출하는 것이 효율적이다. 만약 수천 명의 클라이언트를 관리하는 펌이라면, 모든 데이터를 매번 조회하는 대신 Canopy의 'Watch Updated Clients' 기능을 활용해 변경된 데이터만을 수신하는 이벤트 기반 트리거를 구축하는 것이 시스템 부하를 획기적으로 줄이는 길이다.14

## **세무 서비스 자동화의 미래와 고도화 방향**

Canopy Tax CRM은 현재 AI 기반의 혁신을 가속화하고 있으며, 이는 향후 자동화 아키텍처에도 큰 영향을 미칠 전망이다. 최근 발표된 'Smart Prep'과 'Smart Intake'는 AI가 고객의 답변과 업로드된 서류를 자동으로 매칭하고 체크리스트를 업데이트하는 기능을 제공한다.47 이러한 기능이 고도화되어 외부 API로 노출될 경우, 현재의 커스텀 필드 우회 전략은 AI가 생성한 '완료 신호'를 직접 수신하는 방식으로 진화할 수 있다.47

또한, n8n의 AI Agent 노드를 결합하면 관리자의 수동 승인 단계를 AI가 대신 수행하게 할 수도 있다. 예를 들어, 업로드된 서류의 파일명을 AI가 분석하여 필수 서류인지 판별하고, 누락된 내용이 있다면 리줌 URL을 호출하기 전에 고객에게 자동으로 보완 요청을 보내는 자가 치유형 워크플로우 구축이 가능하다.43 이는 단순한 '신호 전달자'로서의 자동화를 넘어, 세무 대리인의 판단 과정을 보조하는 '지능형 비서'로의 확장을 의미한다.

결론적으로, Canopy Tax CRM의 API 한계는 n8n의 비동기 설계와 커스텀 필드라는 확장 도구를 통해 충분히 극복 가능하다. 기술적 장벽을 해결하는 과정에서 구축된 유연한 아키텍처는 향후 플랫폼의 기능 확장에도 신속하게 대응할 수 있는 기초가 될 것이다. Solapi와의 연동을 통해 완성된 알림 체계는 고객 경험을 극대화하고 세무 법인의 운영 효율성을 혁신적으로 개선하는 핵심 자산이 될 것이며, 이는 경쟁이 치열해지는 세무 서비스 시장에서 강력한 차별화 요소로 작용할 것이다. 세무 대리인은 이제 반복적인 파일 확인과 단순 안내 업무에서 벗어나, 자동화가 제공하는 정확성과 속도를 바탕으로 보다 가치 있는 자문 업무에 집중할 수 있는 환경을 갖추게 되었다.

### ---

**보충 분석: 시스템 연동을 위한 상세 데이터 매핑 및 명세서**

본 연구의 실행력을 높이기 위해, 각 단계에서 사용되는 API 파라미터와 n8n 식의 기술적 관계를 다음과 같이 정리하였다.

#### **1\. Canopy 클라이언트 데이터 조회 (n8n Expression 예시)**

HTTP Request 노드에서 클라이언트 정보를 가져온 후, 특정 커스텀 필드(예: 필드 ID가 12345인 필드)의 값을 추출하기 위한 JSONPath는 다음과 같다.

* {{ $json.custom\_fields.find(f \=\> f.field\_id \=== "12345")?.value }}  
* 이 식은 배열 내의 객체 중 ID가 일치하는 것을 찾아 그 값(Pending/Uploaded 등)을 반환한다.

#### **2\. 이메일 중복 처리 관리**

이메일 트리거 방식에서는 **중복 실행과 누락 방지**를 위한 규칙이 중요하다.

* Gmail 필터로 sender/subject를 정확히 제한  
* n8n에서 “읽지 않은 메일만 처리” 옵션을 사용  
* 필요 시 메일 ID를 기록해 재처리 방지

#### **3\. Solapi AlimTalk 발송 조건 및 규격**

Solapi API v4를 활용한 발송 시 필수 데이터 구조는 다음과 같다.33

* to: 수신자 번호 (하이픈 제외, 한국 국가번호 82 포함 권장)  
* pfId: 카카오 비즈니스 채널 고유 ID  
* templateId: 승인된 알림톡 템플릿 코드  
* variables: 템플릿 내 \#{변수}와 매핑될 키-값 쌍 (JSON 포맷)

이러한 기술적 명세의 일관된 적용은 시스템 간 데이터 유실을 방지하고 에러 발생 시 신속한 디버깅을 가능케 한다. 특히 Canopy API의 응답 데이터 포맷이 변경될 경우를 대비하여 n8n의 'Autodetect' 기능보다는 명시적인 스키마 정의를 통한 데이터 파싱을 권장한다.20

### **최종 구현 가이드 요약**

| 프로세스 단계 | 사용 도구 및 기술 | 핵심 설정 항목 |
| :---- | :---- | :---- |
| **이메일 트리거** | Gmail Trigger | sender/subject 필터 |
| **식별자 추출** | Email Parse | client\_id/이메일/이름 추출 |
| **상세 조회** | Canopy Public API v3 2 | 클라이언트 ID 기반 상세 조회 |
| **최종 알림 발송** | Solapi / Kakao AlimTalk 52 | 템플릿 매칭, 실패 시 SMS 대체 발송 로직 35 |

이 보고서에서 제안한 통합 자동화 모델은 Canopy API의 폐쇄성을 전략적으로 우회하면서도 현업에서 요구하는 복잡한 비즈니스 프로세스를 완벽하게 구현할 수 있는 실무적 해법을 제시한다. 이를 통해 세무 법인은 데이터 기반의 정교한 고객 관리를 실현하고, 인적 자원의 효율적 배치를 통해 서비스의 질적 성장을 도모할 수 있을 것이다. 세무 업무의 자동화는 이제 선택이 아닌 생존을 위한 필수 전략이며, n8n과 Solapi를 결합한 본 아키텍처는 그 여정의 강력한 도구가 될 것이다.

#### **Works cited**

1. Canopy Open API Considerations, accessed January 19, 2026, [https://support.getcanopy.com/en/articles/9376222-canopy-open-api-considerations](https://support.getcanopy.com/en/articles/9376222-canopy-open-api-considerations)  
2. Canopy API, accessed January 19, 2026, [http://help.canopyapp.net/api/index.html](http://help.canopyapp.net/api/index.html)  
3. 3.0 \- Product Documentation, accessed January 19, 2026, [https://docs.dev.canopyco.io/release/3.0.0/](https://docs.dev.canopyco.io/release/3.0.0/)  
4. Upload a File to Canopy, accessed January 19, 2026, [https://support.getcanopy.com/en/articles/9376049-upload-a-file-to-canopy](https://support.getcanopy.com/en/articles/9376049-upload-a-file-to-canopy)  
5. Applying Automation Use Cases \- Canopy \- Zendesk, accessed January 19, 2026, [https://canopytax.zendesk.com/hc/en-us/articles/9169383184923-Applying-Automation-Use-Cases](https://canopytax.zendesk.com/hc/en-us/articles/9169383184923-Applying-Automation-Use-Cases)  
6. Canopy API: Automate Your Accounting Workflow, accessed January 19, 2026, [https://www.getcanopy.com/api](https://www.getcanopy.com/api)  
7. 3.2 Request Info or Files from Clients \*Client Structure \- Canopy Onboarding, accessed January 19, 2026, [https://getcanopyonboarding.zendesk.com/hc/en-us/articles/12879410190619-3-2-Request-Info-or-Files-from-Clients](https://getcanopyonboarding.zendesk.com/hc/en-us/articles/12879410190619-3-2-Request-Info-or-Files-from-Clients)  
8. REST API \- Canopy documentation \- CheckSec, accessed January 19, 2026, [https://docs.checksec.com/canopy/3.12/extending\_canopy/api.html](https://docs.checksec.com/canopy/3.12/extending_canopy/api.html)  
9. Add an Automation Rule to a Task \- Canopy \- Zendesk, accessed January 19, 2026, [https://canopytax.zendesk.com/hc/en-us/articles/9131764398619](https://canopytax.zendesk.com/hc/en-us/articles/9131764398619)  
10. 6.4 Introducing Automation \- Canopy Onboarding, accessed January 19, 2026, [https://getcanopyonboarding.zendesk.com/hc/en-us/articles/12727951543707-6-4-Introducing-Automation](https://getcanopyonboarding.zendesk.com/hc/en-us/articles/12727951543707-6-4-Introducing-Automation)  
11. Add a Custom Field \- Canopy Knowledge Base, accessed January 19, 2026, [https://support.getcanopy.com/en/articles/9375906-add-a-custom-field](https://support.getcanopy.com/en/articles/9375906-add-a-custom-field)  
12. Creating Custom Fields \- Canopy Knowledge Base, accessed January 19, 2026, [https://support.getcanopy.com/en/articles/9375820-creating-custom-fields](https://support.getcanopy.com/en/articles/9375820-creating-custom-fields)  
13. Add an Automation Rule in the Task Workspace | Canopy Knowledge Base, accessed January 19, 2026, [https://support.getcanopy.com/en/articles/9376010-add-an-automation-rule-in-the-task-workspace](https://support.getcanopy.com/en/articles/9376010-add-an-automation-rule-in-the-task-workspace)  
14. Canopy by Maxmel Tech \- Apps Documentation, accessed January 19, 2026, [https://apps.make.com/canopy-api-3vy67p](https://apps.make.com/canopy-api-3vy67p)  
15. Swagger UI \- Canopy, accessed January 19, 2026, [https://api-docs.canopy-sm.com/](https://api-docs.canopy-sm.com/)  
16. Enhancing Canopy Applications with APIs \- PolyAPI documentation, accessed January 19, 2026, [https://docs.polyapi.io/canopy/implement\_api.html](https://docs.polyapi.io/canopy/implement_api.html)  
18. Human in the loop automation: Build AI workflows that keep humans in control \- n8n Blog, accessed January 19, 2026, [https://blog.n8n.io/human-in-the-loop-automation/](https://blog.n8n.io/human-in-the-loop-automation/)  
20. Mastering the n8n HTTP Request Node: Docs, Examples, and Authentication Explained, accessed January 19, 2026, [https://automategeniushub.com/mastering-the-n8n-http-request-node/](https://automategeniushub.com/mastering-the-n8n-http-request-node/)  
22. Control Any n8n Workflow With a Custom UI — Step-by-Step Guide \- Lilys AI, accessed January 19, 2026, [https://lilys.ai/en/notes/n8n-20251017/control-n8n-workflow-custom-ui-guide](https://lilys.ai/en/notes/n8n-20251017/control-n8n-workflow-custom-ui-guide)  
27. HTTP Request node documentation \- n8n Docs, accessed January 19, 2026, [https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)  
29. Notification \> KakaoTalk Bizmessage \> AlimTalk \> Overview, accessed January 19, 2026, [https://docs.nhncloud.com/en/Notification/KakaoTalk%20Bizmessage/en/alimtalk-overview/](https://docs.nhncloud.com/en/Notification/KakaoTalk%20Bizmessage/en/alimtalk-overview/)  
30. 솔라피 커머스 자동화 n8n 연동, accessed January 19, 2026, [https://solapi.com/blog/commerce-auto-n8n-connect/](https://solapi.com/blog/commerce-auto-n8n-connect/)  
31. Solapi 사용 가이드: 카카오톡 메시지 API 활용하기 \- Data Vision, accessed January 19, 2026, [https://vision-ai.tistory.com/m/170](https://vision-ai.tistory.com/m/170)  
32. KakaoTalk Templates | Conversation API \- Sinch Developer Documentation, accessed January 19, 2026, [https://developers.sinch.com/docs/conversation/templates/channel-specific/kakaotalk](https://developers.sinch.com/docs/conversation/templates/channel-specific/kakaotalk)  
33. Formstack SOLAPI Integration \- Quick Connect \- Zapier, accessed January 19, 2026, [https://zapier.com/ja/apps/formstack/integrations/solapi](https://zapier.com/ja/apps/formstack/integrations/solapi)  
34. N8N App (Beta)솔라피(Solapi) 메시지/카카오/커머스 웹훅을 n8n에서 쉽게 사용하기 위한 커뮤니티 노드입니다. (Beta 버전), accessed January 19, 2026, [https://console.solapi.com/apps/9fEGAmn6N2vt](https://console.solapi.com/apps/9fEGAmn6N2vt)  
35. KakaoTalk over API \- Infobip, accessed January 19, 2026, [https://www.infobip.com/docs/kakaotalk/kakaotalk-over-api](https://www.infobip.com/docs/kakaotalk/kakaotalk-over-api)  
36. Notification \> KakaoTalk Bizmessage \> AlimTalk \> API v2.2 Guide \- NHN Cloud 사용자 가이드, accessed January 19, 2026, [https://docs.nhncloud.com/en/Notification/KakaoTalk%20Bizmessage/en/alimtalk-api-guide-v2.2/](https://docs.nhncloud.com/en/Notification/KakaoTalk%20Bizmessage/en/alimtalk-api-guide-v2.2/)  
37. Message Templates \- KakaoTalk \- Alcmeon Help Center, accessed January 19, 2026, [https://help.alcmeon.ai/en\_US/kakaotalk/kkt-modeles-de-messages-templates](https://help.alcmeon.ai/en_US/kakaotalk/kkt-modeles-de-messages-templates)  
38. Send a Kakao Alim message \- Infobip API, accessed January 19, 2026, [https://www.infobip.com/docs/api/channels/kakao/alim/send-kakao-alim/send-kakao-alim-message](https://www.infobip.com/docs/api/channels/kakao/alim/send-kakao-alim/send-kakao-alim-message)  
39. Send Email \- n8n Docs, accessed January 19, 2026, [https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.sendemail/](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.sendemail/)  
40. Send Email node vs Gmail node in n8n – When to use which (Explained) \- Reddit, accessed January 19, 2026, [https://www.reddit.com/r/n8n/comments/1ltyt4b/send\_email\_node\_vs\_gmail\_node\_in\_n8n\_when\_to\_use/](https://www.reddit.com/r/n8n/comments/1ltyt4b/send_email_node_vs_gmail_node_in_n8n_when_to_use/)  
41. When to Use Client Requests Versus Client Email Templates in Canopy, accessed January 19, 2026, [https://www.getcanopy.com/blog/when-to-use-client-requests-versus-client-email-templates-in-canopy](https://www.getcanopy.com/blog/when-to-use-client-requests-versus-client-email-templates-in-canopy)  
42. Client Credentials \- Introduction \- Umbra, accessed January 19, 2026, [https://docs.canopy.umbra.space/docs/authentication-via-client-credentials](https://docs.canopy.umbra.space/docs/authentication-via-client-credentials)  
43. 15 best n8n practices for deploying AI agents in production, accessed January 19, 2026, [https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/](https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/)  
44. Explore n8n Docs: Your Resource for Workflow Automation and Integrations | n8n Docs, accessed January 19, 2026, [https://docs.n8n.io/](https://docs.n8n.io/)  
46. API reference \- n8n Docs, accessed January 19, 2026, [https://docs.n8n.io/api/api-reference/](https://docs.n8n.io/api/api-reference/)  
47. Smart Intake | Canopy | Client Intake | Tax Workflow Automation, accessed January 19, 2026, [https://www.getcanopy.com/smart-intake](https://www.getcanopy.com/smart-intake)  
48. Canopy Expands Tax Workflow With AI-Powered Tax Preparation Through New Filed Integration | Morningstar, accessed January 19, 2026, [https://www.morningstar.com/news/business-wire/20260115092903/canopy-expands-tax-workflow-with-ai-powered-tax-preparation-through-new-filed-integration](https://www.morningstar.com/news/business-wire/20260115092903/canopy-expands-tax-workflow-with-ai-powered-tax-preparation-through-new-filed-integration)  
49. OpenAI's Structured Outputs for API Responses | by Mangesh Pise \- Medium, accessed January 19, 2026, [https://mangeshpise.medium.com/openais-structured-outputs-for-api-responses-6e07d18ac839](https://mangeshpise.medium.com/openais-structured-outputs-for-api-responses-6e07d18ac839)  
50. Definitive Guide to API Integration for Engineers \- n8n Blog, accessed January 19, 2026, [https://blog.n8n.io/api-integration/](https://blog.n8n.io/api-integration/)  
51. Create kakao messages in SOLAPI for new contacts in Follow Up Boss \- Zapier, accessed January 19, 2026, [https://zapier.com/apps/follow-up-boss/integrations/solapi/1463324/create-kakao-messages-in-solapi-for-new-contacts-in-follow-up-boss](https://zapier.com/apps/follow-up-boss/integrations/solapi/1463324/create-kakao-messages-in-solapi-for-new-contacts-in-follow-up-boss)  
52. Alim Talk API, accessed January 19, 2026, [https://api.ncloud-docs.com/docs/en/ai-application-service-sens-alimtalkv2](https://api.ncloud-docs.com/docs/en/ai-application-service-sens-alimtalkv2)
