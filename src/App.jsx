import { useState, useEffect } from 'react'
import './App.css'

// API函数导入
import { 
  getOilPrices, 
  getPriceHistory, 
  getProvinces, 
  getNearbyStations,
  sendVerifyCode,
  loginWithCode
} from './api/oil'

// 油品类型
const OIL_TYPES = [
  { key: '92', label: '92#' },
  { key: '95', label: '95#' },
  { key: '98', label: '98#' },
  { key: '0', label: '0#柴油' }
]

// 省份列表
const MOCK_PROVINCES = ['北京', '上海', '广东', '浙江', '江苏', '四川', '山东', '河南', '湖北', '湖南']

// 油价数据
const MOCK_PRICES = {
  '北京': { '92': 7.58, '95': 8.07, '98': 9.55, '0': 7.32 },
  '上海': { '92': 7.54, '95': 8.03, '98': 9.52, '0': 7.28 },
  '广东': { '92': 7.65, '95': 8.29, '98': 9.89, '0': 7.38 },
  '浙江': { '92': 7.58, '95': 8.07, '98': 9.55, '0': 7.32 },
  '江苏': { '92': 7.55, '95': 8.04, '98': 9.50, '0': 7.29 },
  '四川': { '92': 7.73, '95': 8.26, '98': 9.58, '0': 7.35 },
  '山东': { '92': 7.60, '95': 8.15, '98': 9.15, '0': 7.21 },
  '河南': { '92': 7.64, '95': 8.16, '98': 8.81, '0': 7.28 },
  '湖北': { '92': 7.65, '95': 8.18, '98': 9.98, '0': 7.29 },
  '湖南': { '92': 7.59, '95': 8.06, '98': 9.26, '0': 7.36 }
}

// 生成90天的历史数据
const generateHistory = () => {
  const history = {}
  const basePrices = {
    '92': 7.45, '95': 7.95, '98': 9.35, '0': 7.20
  }
  
  for (let i = 89; i >= 0; i--) {
    const date = new Date('2026-03-20')
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    // 添加一些随机波动
    const variation = (Math.random() - 0.5) * 0.15
    const trend = Math.sin(i / 20) * 0.1 // 周期性趋势
    
    history[dateStr] = {
      '92': +(basePrices['92'] + variation + trend).toFixed(2),
      '95': +(basePrices['95'] + variation + trend).toFixed(2),
      '98': +(basePrices['98'] + variation + trend * 1.2).toFixed(2),
      '0': +(basePrices['0'] + variation + trend * 0.8).toFixed(2)
    }
  }
  
  return { history }
}

const MOCK_HISTORY = generateHistory()

// 加油站数据
const MOCK_STATIONS = [
  { id: 1, name: '中石化朝阳加油站', address: '朝阳区建国路', distance: '1.2km', brand: '中石化', discount: '暂无优惠', lat: 39.9, lng: 116.4 },
  { id: 2, name: '中石油海淀加油站', address: '海淀区中关村', distance: '2.5km', brand: '中石油', discount: '暂无优惠', lat: 39.95, lng: 116.3 },
  { id: 3, name: '壳牌东城加油站', address: '东城区东单', distance: '3.0km', brand: '壳牌', discount: '降0.3元/升', lat: 39.91, lng: 116.42 }
]

function App() {
  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const [agreeTerms, setAgreeTerms] = useState(false)
  
  // 页面状态
  const [page, setPage] = useState('oil')  // oil, trip, my
  const [subPage, setSubPage] = useState('oil')  // oil, trend
  const [tripSubPage, setTripSubPage] = useState('stations')  // stations, fuel
  const [mySubPage, setMySubPage] = useState('profile')  // profile, notify, settings, help
  
  // 油价数据
  const [province, setProvince] = useState('北京')
  const [city, setCity] = useState('北京市')
  const [district, setDistrict] = useState('')
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [provinceList, setProvinceList] = useState([])  // API获取的省份列表
  const [isLocating, setIsLocating] = useState(false)  // 定位中状态
  
  // 定位到当前城市（油价页面）
  const handleLocateCity = () => {
    if (isLocating) return
    
    // 确保省份列表已加载
    if (provinceList.length === 0) {
      alert('正在加载省份数据，请稍后再试')
      return
    }
    
    setIsLocating(true)
    
    // 桌面浏览器默认使用IP定位（更稳定）
    const isDesktop = !navigator.userAgent.match(/Mobile|Android|iPhone|iPad/)
    
    if (!isDesktop && navigator.geolocation) {
      // 移动端使用GPS定位
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          console.log('GPS位置:', latitude, longitude)
          
          // 调用逆地理编码API获取城市
          try {
            const response = await fetch(`https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=NVLBZ-UIDC4-YTFUP-KMHA5-BGBGF-HZFNH`)
            const data = await response.json()
            if (data.status === 0 && data.result) {
              const { province, city } = data.result.ad_info
              console.log('定位城市:', province, city)
              
              // 匹配省份列表
              const matchedProvince = provinceList.find(p => province?.includes(p) || p.includes(province?.replace('省', '').replace('市', '')))
              if (matchedProvince) {
                setProvince(matchedProvince)
                setCity(city || Object.keys(cityData[matchedProvince]?.cities || {})[0] || '')
              }
            }
          } catch (e) {
            console.error('逆地理编码失败:', e)
            // 失败时使用IP定位
            handleIPLocate()
          }
          setIsLocating(false)
        },
        (error) => {
          console.error('GPS定位失败:', error)
          // GPS失败时尝试IP定位
          handleIPLocate()
        },
        { enableHighAccuracy: false, timeout: 5000 }
      )
    } else {
      // 桌面浏览器或GPS失败时使用IP定位
      handleIPLocate()
    }
  }
  
  // IP定位（备用方案）
  const handleIPLocate = async () => {
    try {
      // 使用免费的IP定位API
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      console.log('IP定位:', data)
      
      if (data.region && provinceList.length > 0) {
        const cityName = data.city || data.region
        // 匹配省份
        const matchedProvince = provinceList.find(p => p.includes(data.region) || data.region.includes(p))
        if (matchedProvince) {
          setProvince(matchedProvince)
          setCity(cityName)
        } else {
          console.log('未匹配到省份，使用默认')
        }
      }
    } catch (e) {
      console.error('IP定位失败:', e)
    }
    setIsLocating(false)
  }
  
  // 城市数据（34省份）
  const cityData = {
    '北京':{cities:{'北京市':['东城区','西城区','朝阳区','丰台区','石景山区','海淀区','门头沟区','房山区','通州区','顺义区','昌平区','大兴区','怀柔区','平谷区','密云区','延庆区']}},
    '上海':{cities:{'上海市':['黄浦区','徐汇区','长宁区','静安区','普陀区','虹口区','杨浦区','闵行区','宝山区','嘉定区','浦东新区','金山区','松江区','青浦区','奉贤区','崇明区']}},
    '天津':{cities:{'天津市':['和平区','河东区','河西区','南开区','河北区','红桥区','东丽区','西青区','津南区','北辰区','武清区','宝坻区','滨海新区','宁河区','静海区','蓟州区']}},
    '重庆':{cities:{'重庆市':['万州区','涪陵区','渝中区','大渡口区','江北区','沙坪坝区','九龙坡区','南岸区','北碚区','渝北区','巴南区','黔江区','长寿区','璧山区','开州区','梁平区']}},
    '广东':{cities:{'广州市':['荔湾区','越秀区','海珠区','天河区','白云区','黄埔区','番禺区','花都区','南沙区','从化区','增城区'],'深圳市':['罗湖区','福田区','南山区','宝安区','龙岗区','盐田区','龙华区','坪山区','光明区'],'珠海市':['香洲区','斗门区','金湾区'],'佛山市':['禅城区','南海区','顺德区','三水区','高明区'],'东莞市':['南城区','东城区','万江区','莞城区'],'汕头市':['龙湖区','金平区','濠江区','潮阳区','潮南区','澄海区']}},
    '浙江':{cities:{'杭州市':['上城区','拱墅区','西湖区','滨江区','萧山区','余杭区','富阳区','临安区'],'宁波市':['海曙区','江北区','北仑区','镇海区','鄞州区','奉化区'],'温州市':['鹿城区','龙湾区','瓯海区','洞头区'],'嘉兴市':['南湖区','秀洲区'],'湖州市':['吴兴区','南浔区'],'绍兴市':['越城区','柯桥区','上虞区'],'金华市':['婺城区','金东区'],'台州市':['椒江区','黄岩区','路桥区']}},
    '江苏':{cities:{'南京市':['玄武区','秦淮区','建邺区','鼓楼区','浦口区','栖霞区','雨花台区','江宁区','六合区','溧水区','高淳区'],'苏州市':['姑苏区','虎丘区','吴中区','相城区','吴江区','常熟市','张家港市','昆山市','太仓市'],'无锡市':['梁溪区','滨湖区','锡山区','惠山区','新吴区'],'常州市':['天宁区','钟楼区','新北区','武进区','金坛区','溧阳市'],'南通市':['崇川区','通州区','海门区'],'扬州市':['广陵区','邗江区','江都区'],'镇江市':['京口区','润州区','丹徒区']}},
    '山东':{cities:{'济南市':['历下区','市中区','槐荫区','天桥区','历城区','长清区','章丘区','济阳区','莱芜区','钢城区'],'青岛市':['市南区','市北区','黄岛区','崂山区','李沧区','城阳区','即墨区','胶州市','平度市','莱西市'],'烟台市':['芝罘区','福山区','牟平区','莱山区','蓬莱区','龙口市','莱阳市','莱州市','招远市'],'威海市':['环翠区','文登区','荣成市','乳山市'],'潍坊市':['奎文区','潍城区','寒亭区','坊子区','青州市','诸城市','寿光市']}},
    '四川':{cities:{'成都市':['锦江区','青羊区','金牛区','武侯区','成华区','龙泉驿区','青白江区','新都区','温江区','双流区','郫都区','新津区','金堂县','大邑县','蒲江县','都江堰市','彭州市','邛崃市','崇州市','简阳市'],'绵阳市':['涪城区','游仙区','安州区'],'自贡市':['自流井区','贡井区','大安区','沿滩区'],'泸州市':['江阳区','纳溪区','龙马潭区']}},
    '湖北':{cities:{'武汉市':['江岸区','江汉区','硚口区','汉阳区','武昌区','青山区','洪山区','东西湖区','汉南区','蔡甸区','江夏区','黄陂区','新洲区'],'黄石市':['黄石港区','西塞山区','下陆区','铁山区'],'十堰市':['茅箭区','张湾区','郧阳区'],'宜昌市':['西陵区','伍家岗区','点军区','猇亭区','夷陵区'],'襄阳市':['襄城区','樊城区','襄州区']}},
    '湖南':{cities:{'长沙市':['芙蓉区','天心区','岳麓区','开福区','雨花区','望城区','长沙县','浏阳市','宁乡市'],'株洲市':['天元区','荷塘区','芦淞区','石峰区','渌口区'],'湘潭市':['雨湖区','岳塘区','湘潭县'],'衡阳市':['蒸湘区','珠晖区','雁峰区','石鼓区','南岳区']}},
    '福建':{cities:{'福州市':['鼓楼区','台江区','仓山区','马尾区','晋安区','长乐区','闽侯县','连江县','罗源县','闽清县','永泰县','平潭县','福清市'],'厦门市':['思明区','海沧区','湖里区','集美区','同安区','翔安区'],'泉州市':['鲤城区','丰泽区','洛江区','泉港区','惠安县','安溪县','永春县','德化县','石狮市','晋江市','南安市']}},
    '安徽':{cities:{'合肥市':['瑶海区','庐阳区','蜀山区','包河区','长丰县','肥东县','肥西县','庐江县','巢湖市'],'芜湖市':['镜湖区','弋江区','鸠江区','三山区','芜湖县','繁昌县','南陵县','无为市'],'蚌埠市':['龙子湖区','蚌山区','禹会区','淮上区','怀远县','五河县','固镇县']}},
    '江西':{cities:{'南昌市':['东湖区','西湖区','青云谱区','青山湖区','新建区','红谷滩区','南昌县','进贤县','安义县'],'景德镇市':['昌江区','珠山区','浮梁县','乐平市'],'九江市':['浔阳区','濂溪区','柴桑区','武宁县','修水县','永修县','德安县','都昌县','湖口县','彭泽县','瑞昌市','共青城市','庐山市']}},
    '河北':{cities:{'石家庄市':['长安区','桥西区','新华区','井陉矿区','裕华区','藁城区','鹿泉区','栾城区','井陉县','正定县','行唐县','灵寿县','高邑县','深泽县','赞皇县','无极县','平山县','元氏县','赵县','辛集市','晋州市','新乐市'],'唐山市':['路南区','路北区','古冶区','开平区','丰南区','丰润区','曹妃甸区','滦南县','乐亭县','迁西县','玉田县','遵化市','迁安市','滦州市']}},
    '河南':{cities:{'郑州市':['中原区','二七区','管城区','金水区','上街区','惠济区','中牟县','巩义市','荥阳市','新密市','新郑市','登封市'],'开封市':['龙亭区','顺河区','鼓楼区','禹王台区','祥符区','杞县','通许县','尉氏县','兰考县'],'洛阳市':['老城区','西工区','瀍河区','涧西区','吉利区','洛龙区','孟津区','新安县','栾川县','嵩县','汝阳县','宜阳县','洛宁县','伊川县','偃师区']}},
    '山西':{cities:{'太原市':['小店区','迎泽区','杏花岭区','尖草坪区','万柏林区','晋源区','清徐县','阳曲县','娄烦县','古交市'],'大同市':['新荣区','平城区','云冈区','云州区','阳高县','天镇县','广灵县','灵丘县','浑源县','左云县'],'长治市':['潞州区','上党区','屯留区','潞城区','襄垣县','平顺县','黎城县','壶关县','长子县','武乡县','沁县','沁源县']}},
    '陕西':{cities:{'西安市':['新城区','碑林区','莲湖区','灞桥区','未央区','雁塔区','阎良区','临潼区','长安区','高陵区','鄠邑区','蓝田县','周至县'],'铜川市':['王益区','印台区','耀州区','宜君县'],'宝鸡市':['渭滨区','金台区','陈仓区','凤翔区','岐山县','扶风县','眉县','陇县','千阳县','麟游县']}},
    '辽宁':{cities:{'沈阳市':['和平区','沈河区','大东区','皇姑区','铁西区','苏家屯区','浑南区','沈北新区','于洪区','辽中区','康平县','法库县','新民市'],'大连市':['中山区','西岗区','沙河口区','甘井子区','旅顺口区','金州区','普兰店区','长海县','瓦房店市','庄河市'],'鞍山市':['铁东区','铁西区','立山区','千山区','台安县','岫岩县','海城市']}},
    '吉林':{cities:{'长春市':['南关区','宽城区','朝阳区','二道区','绿园区','双阳区','九台区','农安县','德惠市','榆树市'],'吉林市':['昌邑区','龙潭区','船营区','丰满区','永吉县','蛟河市','桦甸市','舒兰市','磐石市']}},
    '黑龙江':{cities:{'哈尔滨市':['道里区','南岗区','道外区','平房区','松北区','香坊区','呼兰区','阿城区','双城区','依兰县','方正县','宾县','巴彦县','木兰县','通河县','延寿县','尚志市','五常市'],'齐齐哈尔市':['龙沙区','建华区','铁锋区','昂昂溪区','富拉尔基区','碾子山区','梅里斯区','龙江县','依安县','泰来县','甘南县','富裕县','克山县','克东县','拜泉县','讷河市']}},
    '甘肃':{cities:{'兰州市':['城关区','七里河区','西固区','安宁区','红古区','永登县','皋兰县','榆中县'],'嘉峪关市':['雄关区','镜铁区','长城区'],'金昌市':['金川区','永昌县'],'白银市':['白银区','平川区','靖远县','会宁县','景泰县'],'天水市':['秦州区','麦积区','清水县','秦安县','甘谷县','武山县','张家川县'],'武威市':['凉州区','民勤县','古浪县','天祝县'],'张掖市':['甘州区','肃南县','民乐县','临泽县','高台县','山丹县'],'平凉市':['崆峒区','泾川县','灵台县','崇信县','华亭市','庄浪县','静宁县'],'酒泉市':['肃州区','金塔县','瓜州县','肃北县','阿克县','玉门市','敦煌市'],'庆阳市':['西峰区','庆城县','环县','华池县','合水县','正宁县','宁县','镇原县'],'定西市':['安定区','通渭县','陇西县','渭源县','临洮县','漳县','岷县'],'陇南市':['武都区','成县','文县','宕昌县','康县','西和县','礼县','徽县','两当县'],'临夏州':['临夏市','临夏县','康乐县','永靖县','广河县','和政县','东乡县','积石山县'],'甘南州':['合作市','临潭县','卓尼县','舟曲县','迭部县','玛曲县','碌曲县','夏河县']}},
    '青海':{cities:{'西宁市':['城东区','城中区','城西区','城北区','大通县','湟源县','湟中区'],'海东市':['乐都区','平安区','民和县','互助县','化隆县','循化县'],'海北州':['门源县','祁连县','海晏县','刚察县'],'黄南州':['同仁县','尖扎县','泽库县','河南县'],'海南州':['共和县','同德县','贵德县','兴海县','贵南县'],'果洛州':['玛沁县','班玛县','甘德县','达日县','久治县','玛多县'],'玉树州':['玉树市','杂多县','称多县','治多县','囊谦县','曲麻莱县'],'海西州':['德令哈市','格尔木市','乌兰县','都兰县','天峻县','大柴旦行委','冷湖行委','茫崖行委']}},
    '内蒙古':{cities:{'呼和浩特市':['新城区','回民区','玉泉区','赛罕区','土左旗','托县','和林县','清水河县','武川县'],'包头市':['东河区','昆都仑区','青山区','石拐区','白云区','九原区','土右旗','固阳县','达茂旗'],'乌海市':['海勃湾区','海南区','乌达区'],'赤峰市':['红山区','松山区','元宝山区','阿鲁旗','巴林左旗','巴林右旗','林西县','克什克腾旗','翁牛特旗','喀喇沁旗','宁城县','敖汉旗'],'通辽市':['科尔沁区','霍林郭勒市','科尔沁左翼中旗','科尔沁左翼后旗','开鲁县','库伦旗','奈曼旗','扎鲁特旗','科尔沁左翼后旗'],'鄂尔多斯市':['康巴什区','东胜区','达拉特旗','准格尔旗','鄂托克前旗','鄂托克旗','杭锦旗','伊金霍洛旗'],'呼伦贝尔市':['海拉尔区','扎赉诺尔区','阿荣旗','莫旗','鄂温克旗','新左旗','新右旗','满洲里市','牙克石市','扎兰屯市','额尔古纳市','根河市'],'巴彦淖尔市':['临河区','五原县','磴口县','乌拉特前旗','乌拉特中旗','乌拉特后旗','杭锦后旗'],'乌兰察布市':['集宁区','卓资县','化德县','商都县','兴和县','凉城县','察右前旗','察右中旗','察右后旗','四子王旗','丰镇市'],'兴安盟':['乌兰浩特市','阿尔山市','科尔沁右翼前旗','科尔沁右翼中旗','扎赉特旗','突泉县'],'锡林郭勒盟':['锡林浩特市','二连浩特市','阿巴嘎旗','苏尼特左旗','苏尼特右旗','东乌旗','西乌旗','太仆寺旗','镶黄旗','正镶白旗','正蓝旗','多伦县'],'阿拉善盟':['阿拉善左旗','阿拉善右旗','额济纳旗']}},
    '广西':{cities:{'南宁市':['兴宁区','青秀区','江南区','西乡塘区','良庆区','邕宁区','武鸣区','隆安县','马山县','上林县','宾阳县','横州市'],'柳州市':['城中区','鱼峰区','柳南区','柳北区','柳江区','柳城县','鹿寨县','融安县','融水县','三江县'],'桂林市':['秀峰区','叠彩区','象山区','七星区','雁山区','临桂区','阳朔县','灵川县','全州县','兴安县','永福县','灌阳县','龙胜县','资源县','平乐县','恭城县','荔浦市'],'梧州市':['万秀区','长洲区','龙圩区','苍梧县','藤县','蒙山县','岑溪市'],'北海市':['海城区','银海区','铁山港区','合浦县'],'防城港市':['港口区','防城区','上思县','东兴市'],'钦州市':['钦南区','钦北区','灵山县','浦北县'],'贵港市':['港北区','港南区','覃塘区','平南县','桂平市'],'玉林市':['玉州区','福绵区','容县','陆川县','博白县','兴业县','北流市'],'百色市':['右江区','田阳区','田东县','平果县','德保县','那坡县','凌云县','乐业县','田林县','西林县','隆林县','靖西市','平果市'],'贺州市':['八步区','平桂区','昭平县','钟山县','富川县'],'河池市':['金城江区','宜州区','南丹县','天峨县','凤山县','东兰县','罗城县','环江县','巴马县','都安县','大化县','天峨县'],'来宾市':['兴宾区','忻城县','象州县','武宣县','金秀县','合山市'],'崇左市':['江州区','扶绥县','宁明县','龙州县','大新县','天等县','凭祥市']}},
    '宁夏':{cities:{'银川市':['兴庆区','西夏区','金凤区','永宁县','贺兰县','灵武市'],'石嘴山市':['大武口区','惠农区','平罗县'],'吴忠市':['利通区','红寺堡区','盐池县','同心县','青铜峡市'],'固原市':['原州区','西吉县','隆德县','泾源县','彭阳县'],'中卫市':['沙坡头区','中宁县','海原县']}},
    '新疆':{cities:{'乌鲁木齐市':['天山区','沙依巴克区','新市区','水磨沟区','头屯河区','达坂城区','米东区','乌鲁木齐县'],'克拉玛依市':['独山子区','克拉玛依区','白碱滩区','乌尔禾区'],'吐鲁番市':['高昌区','鄯善县','托克逊县'],'哈密市':['伊州区','巴里坤县','伊吾县'],'昌吉州':['昌吉市','阜康市','呼图壁县','玛纳斯县','奇台县','吉木萨尔县','木垒县'],'博尔塔拉州':['博乐市','阿拉山口市','精河县','温泉县'],'巴音郭楞州':['库尔勒市','轮台县','尉犁县','若羌县','且末县','焉耆县','和静县','和硕县','博湖县','铁门关市'],'阿克苏地区':['阿克苏市','温宿县','库车市','沙雅县','新和县','拜城县','乌什县','阿瓦提县','柯坪县'],'克孜勒苏州':['阿图什市','阿克陶县','阿合奇县','乌恰县'],'喀什地区':['喀什市','疏附县','疏勒县','英吉沙县','泽普县','莎车县','叶城县','麦盖提县','岳普湖县','伽师县','巴楚县','塔什库尔干县'],'和田地区':['和田市','和田县','墨玉县','皮山县','洛浦县','策勒县','于田县','民丰县'],'伊犁州':['伊宁市','奎屯市','霍尔果斯市','伊宁县','察布查尔县','霍城县','新源县','昭苏县','特克斯县','尼勒克县'],'塔城地区':['塔城市','乌苏市','额敏县','沙湾县','托里县','裕民县','和布克赛尔县'],'阿勒泰地区':['阿勒泰市','布尔津县','富蕴县','福海县','哈巴河县','青河县','吉木乃县']}},
    '西藏':{cities:{'拉萨市':['城关区','堆龙德庆区','达孜区','林周县','尼木县','当雄县','曲水县','墨竹工卡县','格尔木办事处'],'日喀则市':['桑珠孜区','南木林县','江孜县','定日县','萨迦县','拉孜县','昂仁县','谢通门县','白朗县','仁布县','康马县','定结县','仲巴县','亚东县','吉隆县','聂拉木县','萨嘎县','岗巴县'],'昌都市':['卡若区','江达县','贡觉县','类乌齐县','丁青县','察雅县','八宿县','左贡县','芒康县','洛隆县','边坝县'],'林芝市':['巴宜区','工布江达县','米林县','墨脱县','波密县','察隅县','朗县'],'山南市':['乃东区','扎囊县','贡嘎县','桑日县','琼结县','曲松县','措美县','洛扎县','加查县','隆子县','错那县','浪卡子县'],'那曲市':['色尼区','嘉黎县','比如县','聂荣县','安多县','申扎县','索县','班戈县','巴青县','尼玛县','双湖县'],'阿里地区':['普兰县','札达县','噶尔县','日土县','革吉县','改则县','措勤县']}},
    '海南':{cities:{'海口市':['秀英区','龙华区','琼山区','美兰区'],'三亚市':['海棠区','吉阳区','天涯区','崖州区'],'三沙市':['西沙区','南沙区'],'儋州市':['那大镇','白马井镇']}},
    '云南':{cities:{'昆明市':['五华区','盘龙区','官渡区','西山区','东川区','呈贡区','晋宁区','富民县','宜良县','石林县','嵩明县','禄劝县','寻甸县','安宁市'],'曲靖市':['麒麟区','沾益区','马龙区','陆良县','师宗县','罗平县','富源县','会泽县','宣威市'],'玉溪市':['红塔区','江川区','澄江县','通海县','华宁县','易门县','峨山县','新平县','元江县'],'保山市':['隆阳区','施甸县','腾冲市','龙陵县','昌宁县'],'昭通市':['昭阳区','鲁甸县','巧家县','盐津县','大关县','永善县','绥江县','镇雄县','彝良县','威信县','水富市'],'丽江市':['古城区','玉龙县','永胜县','华坪县','宁蒗县'],'普洱市':['思茅区','宁洱县','墨江县','景东县','景谷县','镇沅县','江城县','孟连县','澜沧县','西盟县'],'临沧市':['临翔区','凤庆县','云县','永德县','镇康县','双江县','耿马县','沧源县'],'楚雄州':['楚雄市','双柏县','牟定县','南华县','姚安县','大姚县','永仁县','元谋县','武定县','禄丰市'],'红河州':['个旧市','开远市','蒙自市','弥勒市','屏边县','建水县','石屏县','泸西县','元阳县','红河县','绿春县','金平县','河口县'],'文山州':['文山市','砚山县','西畴县','麻栗坡县','马关县','丘北县','广南县','富宁县'],'西双版纳州':['景洪市','勐海县','勐腊县'],'大理州':['大理市','漾濞县','祥云县','宾川县','弥渡县','南涧县','巍山县','永平县','云龙县','洱源县','剑川县','鹤庆县'],'德宏州':['瑞丽市','芒市','梁河县','盈江县','陇川县'],'怒江州':['泸水市','福贡县','贡山县','兰坪县'],'迪庆州':['香格里拉市','德钦县','维西县']}},
    '贵州':{cities:{'贵阳市':['南明区','云岩区','花溪区','乌当区','白云区','观山湖区','开阳县','息烽县','修文县','清镇市'],'六盘水市':['钟山区','六枝特区','水城区','盘州市'],'遵义市':['红花岗区','汇川区','播州区','桐梓县','绥阳县','正安县','道真县','务川县','凤冈县','湄潭县','余庆县','习水县','赤水市','仁怀市'],'安顺市':['西秀区','平坝区','普定县','镇宁县','关岭县','紫云县'],'毕节市':['七星关区','大方县','黔西县','金沙县','织金县','纳雍县','赫章县','威宁县'],'铜仁市':['碧江区','万山区','江口县','玉屏县','石阡县','思南县','印江县','德江县','沿河县','松桃县'],'黔西南州':['兴义市','兴仁市','普安县','晴隆县','贞丰县','望谟县','册亨县','安龙县'],'黔东南州':['凯里市','黄平县','施秉县','三穗县','镇远县','岑巩县','天柱县','锦屏县','剑河县','台江县','黎平县','榕江县','从江县','雷山县','麻江县','丹寨县'],'黔南州':['都匀市','福泉市','荔波县','贵定县','瓮安县','独山县','平塘县','罗甸县','长顺县','龙里县','惠水县','三都县']}},
    '香港':{cities:{'香港岛':['中西区','湾仔区','东区','南区'],'九龙':['油尖旺区','深水埗区','九龙城区','黄大仙区','观塘区'],'新界':['北区','大埔区','沙田区','西贡区','荃湾区','屯门区','元朗区','葵青区','离岛区']}},
    '澳门':{cities:{'澳门半岛':['花地玛堂区','花王堂区','望德堂区','大堂区','风顺堂区'],'离岛':['嘉模堂区','路凼填海区','圣方济各堂区']}},
    '台湾':{cities:{'台北市':['中正区','大同区','中山区','松山区','大安区','万华区','信义区','士林区','北投区','内湖区','南港区','文山区'],'新北市':['板桥区','三重区','新庄区','中和区','永和区','土城区','树林区','莺歌区','三峡区','淡水区','汐止区','林口区'],'桃园市':['桃园区','中坜区','平镇区','八德区','杨梅区','芦园区','大溪区','龟山区','龙潭区','大园区','观音区','新屋区'],'台中市':['中区','东区','南区','西区','北区','北屯区','西屯区','南屯区','太平区','大里区','雾峰区','乌日区','丰原区','后里区','潭子区','大雅区','神冈区','石冈区','东势区','新社区','和平区'],'台南市':['东区','南区','西区','北区','安平区','安南区','永康区','归仁区','新化区','左镇区','玉井区','楠西区','南化区','仁德区','关庙区','龙崎区','官田区','麻豆区','佳里区','西港区','七股区','将军区','学甲区','北门区','新营区','盐水区','白河区','柳营区','后壁区','东山区','六甲区','下营区','四草区','大内区','山上区','善化区','安定区'],'高雄市':['楠梓区','左营区','鼓山区','苓雅区','前镇区','旗津区','小港区','前镇区','凤山区','大寮区','鸟松区','林园区','仁武区','大社区','阿莲区','路竹区','湖内区','茄萣区','永安区','弥陀区','桥头区','梓官区','燕巢区','田寮区','旗山区','美浓区','六龟区','甲仙区','杉林区','内门区','茂林区','桃源区','那玛夏区']}}
  }
  
  const provinceOptions = provinceList.length > 0 ? provinceList : Object.keys(cityData)
  const currentCityOptions = cityData[province] ? Object.keys(cityData[province].cities) : []
  const currentDistrictOptions = (city && cityData[province]?.cities?.[city]) ? cityData[province].cities[city] : []
  
  const [oilType, setOilType] = useState('92')
  const [prices, setPrices] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [trendDays, setTrendDays] = useState(7)
  
  // 登录
  const [loginPhone, setLoginPhone] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [showLoginSuccess, setShowLoginSuccess] = useState(false)
  
  // 定位
  const [location, setLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  
  // 加油站
  const [stations, setStations] = useState([])
  const [stationLoading, setStationLoading] = useState(false)
  
  // 油耗记录
  const [fuelRecords, setFuelRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fuelRecords')) || []
    } catch {
      return []
    }
  })
  const [showAddFuel, setShowAddFuel] = useState(false)

  // ===== 动画状态 =====
  const [priceAnimating, setPriceAnimating] = useState(false)
  const [priceDirection, setPriceDirection] = useState(null) // 'up' | 'down'
  const [activeTab, setActiveTab] = useState('oil')
  const [listScrolling, setListScrolling] = useState(false)
  
  // 提醒设置
  const [toggles, setToggles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('toggles')) || { priceUp: true, priceDown: true, lowFuel: true }
    } catch {
      return { priceUp: true, priceDown: true, lowFuel: true }
    }
  })

  // 保存数据
  useEffect(() => {
    localStorage.setItem('fuelRecords', JSON.stringify(fuelRecords))
  }, [fuelRecords])

  useEffect(() => {
    localStorage.setItem('toggles', JSON.stringify(toggles))
  }, [toggles])

  // 加载省份列表（API）
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const data = await getProvinces()
        if (data && data.length > 0) {
          setProvinceList(data)
        }
      } catch (e) {
        console.error('Failed to fetch provinces:', e)
      }
    }
    fetchProvinces()
  }, [])

  // 加载油价数据
  useEffect(() => {
    const fetchPrices = async () => {
      setLoading(true)
      try {
        const data = await getOilPrices()
        if (data && data.prices) {
          setPrices(data.prices)
        } else {
          // 如果API失败，使用MOCK数据
          setPrices(MOCK_PRICES)
        }
      } catch (error) {
        console.error('获取油价数据失败:', error)
        setPrices(MOCK_PRICES)
      }
      setLoading(false)
    }
    fetchPrices()
  }, [province])

  // 油价变化动画
  useEffect(() => {
    if (!prices || !history) return
    const currentPrice = prices[province]?.[oilType] || 0
    const dates = Object.keys(history.history || {}).sort()
    if (dates.length < 2) return
    const prevPrice = history.history[dates[dates.length - 2]]?.[oilType] || 0
    
    if (currentPrice > prevPrice) {
      setPriceDirection('up')
    } else if (currentPrice < prevPrice) {
      setPriceDirection('down')
    }
    
    setPriceAnimating(true)
    const timer = setTimeout(() => setPriceAnimating(false), 600)
    return () => clearTimeout(timer)
  }, [oilType, province, prices, history])

  // 省份列表滚动动画
  useEffect(() => {
    if (prices) {
      setProvinceList(Object.entries(prices))
      // 触发列表入场动画
      setListScrolling(true)
      setTimeout(() => setListScrolling(false), 300)
    }
  }, [prices, oilType])

  // 加载历史数据
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getPriceHistory(province, trendDays)
        if (data && data.history) {
          setHistory(data)
        } else {
          setHistory(MOCK_HISTORY)
        }
      } catch (error) {
        console.error('获取历史数据失败:', error)
        setHistory(MOCK_HISTORY)
      }
    }
    fetchHistory()
  }, [province, trendDays])

  // 验证码倒计时
  useEffect(() => {
    if (codeCountdown > 0) {
      const timer = setTimeout(() => setCodeCountdown(codeCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [codeCountdown])

  // 加载加油站数据
  // 计算两点之间的距离（公里）
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371 // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // 导航到加油站（调起地图选择）
  const handleNavigate = (station) => {
    const { lat, lng, name, address } = station
    const encodeName = encodeURIComponent(name)
    const encodeAddr = encodeURIComponent(address)
    
    // 构建高德URI
    const amapUrl = `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeName}&coordinate=gaode&callnative=1`
    const bmapUrl = `http://api.map.baidu.com/marker?location=${lat},${lng}&title=${encodeName}&content=${encodeAddr}&output=html&coord_type=gcj02&src=webapp.baidu.openAPIdemo`
    
    // 使用地图选择弹窗
    const mapChoice = confirm('请选择导航软件：\n确定 = 高德地图\n取消 = 百度地图')
    
    if (mapChoice) {
      // 高德地图
      window.location.href = amapUrl
    } else {
      // 百度地图
      window.open(bmapUrl, '_blank')
    }
  }

  // 订阅加油站价格变动
  const handleSubscribe = (station) => {
    // 保存订阅信息到localStorage（实际应该存到后端）
    const subscriptions = JSON.parse(localStorage.getItem('stationSubscriptions') || '[]')
    const isSubscribed = subscriptions.find(s => s.id === station.id)
    
    if (isSubscribed) {
      // 取消订阅
      const newSubscriptions = subscriptions.filter(s => s.id !== station.id)
      localStorage.setItem('stationSubscriptions', JSON.stringify(newSubscriptions))
      alert(`已取消订阅 ${station.name} 的价格变动通知`)
    } else {
      // 添加订阅
      subscriptions.push({
        id: station.id,
        name: station.name,
        brand: station.brand,
        address: station.address,
        subscribedAt: new Date().toISOString()
      })
      localStorage.setItem('stationSubscriptions', JSON.stringify(subscriptions))
      alert(`订阅成功！${station.name} 价格变动时您将收到通知`)
    }
  }

  useEffect(() => {
    const fetchStations = async () => {
      if (page === 'trip' && tripSubPage === 'stations') {
        setStationLoading(true)
        try {
          // 使用定位或默认北京坐标
          const lat = location?.lat || 39.9
          const lng = location?.lng || 116.4
          const data = await getNearbyStations(lat, lng)
          
          let stationList = []
          if (data && data.stations && data.stations.length > 0) {
            stationList = data.stations
          } else {
            stationList = MOCK_STATIONS
          }
          
          // 计算实际距离并按距离排序
          if (lat && lng) {
            stationList = stationList.map(station => ({
              ...station,
              _distance: getDistance(lat, lng, station.lat, station.lng)
            })).sort((a, b) => a._distance - b._distance)
          }
          
          setStations(stationList)
        } catch (error) {
          console.error('获取加油站数据失败:', error)
          setStations(MOCK_STATIONS)
        }
        setStationLoading(false)
      }
    }
    fetchStations()
  }, [page, tripSubPage, location])

  // 定位
  const handleLocation = () => {
    // 桌面浏览器默认定位到北京
    setLocation({ lat: 39.9042, lng: 116.4074 })
    setLocationLoading(true)
    setTimeout(() => setLocationLoading(false), 500)
  }

  // 发送验证码
  const handleSendCode = async () => {
    if (!loginPhone || loginPhone.length !== 11) {
      alert('请输入正确的手机号')
      return
    }
    
    try {
      const result = await sendVerifyCode(loginPhone)
      if (result.success) {
        setCodeCountdown(60)
        alert('验证码已发送，请注意查收')
      } else {
        alert(result.error || '发送失败，请重试')
      }
    } catch (error) {
      console.error('发送验证码失败:', error)
      alert('发送失败，请重试')
    }
  }

  // 登录
  const handleLogin = async () => {
    if (!agreeTerms) {
      alert('请先同意用户协议')
      return
    }
    if (!loginPhone || !verifyCode) {
      alert('请输入手机号和验证码')
      return
    }
    
    try {
      const result = await loginWithCode(loginPhone, verifyCode)
      if (result.success) {
        setIsLoggedIn(true)
        setUserInfo({ 
          phone: result.user?.phone || loginPhone, 
          token: result.token,
          name: '用户' + loginPhone.slice(-4) 
        })
        setShowLoginSuccess(true)
        setTimeout(() => setShowLoginSuccess(false), 2000)
      } else {
        alert(result.error || '登录失败，请重试')
      }
    } catch (error) {
      console.error('登录失败:', error)
      alert('登录失败，请重试')
      // 演示模式：允许继续
      setIsLoggedIn(true)
      setUserInfo({ phone: loginPhone, name: '用户' + loginPhone.slice(-4) })
      setShowLoginSuccess(true)
      setTimeout(() => setShowLoginSuccess(false), 2000)
    }
  }

  // 退出登录
  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserInfo(null)
  }

  // 获取当前价格
  const getCurrentPrice = () => {
    if (!prices || !prices[province]) return '--'
    return prices[province][oilType] || '--'
  }

  // 获取价格变化
  const getPriceChange = () => {
    if (!history || !history.history) return '--'
    const dates = Object.keys(history.history).sort()
    if (dates.length < 2) return '--'
    const today = prices?.[province]?.[oilType] || 0
    const yesterday = history.history[dates[dates.length - 2]]?.[oilType] || 0
    const change = today - yesterday
    return change.toFixed(2)
  }

  // ===== 渲染登录页 =====
  const renderLoginPage = () => (
    <div className="login-page">
      {/* 背景动画 */}
      <div className="login-bg-animation">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      <div className="login-content">
        <div className="login-logo-wrap">
          <div className="login-logo">⛽</div>
          <div className="logo-glow"></div>
        </div>
        <div className="login-title">油价守护者</div>
        <div className="login-subtitle">智能油价监测，省心加油</div>
        
        <div className="login-form">
          <div className="input-group">
            <div className="input-icon">📱</div>
            <input
              type="tel"
              placeholder="请输入手机号"
              value={loginPhone}
              onChange={e => setLoginPhone(e.target.value)}
              className="login-input"
              maxLength={11}
            />
          </div>
          
          <div className="input-group">
            <div className="input-icon">🔐</div>
            <input
              type="text"
              placeholder="请输入验证码"
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value)}
              className="login-input code-input"
              maxLength={6}
            />
            <button 
              className="code-btn" 
              onClick={handleSendCode}
              disabled={codeCountdown > 0}
            >
              {codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码'}
            </button>
          </div>
          
          <label className="agree-row">
            <div className="checkbox-custom">
              <input 
                type="checkbox" 
                checked={agreeTerms} 
                onChange={e => setAgreeTerms(e.target.checked)} 
              />
              <span className="checkmark">✓</span>
            </div>
            <span className="agree-text">我已阅读并同意《用户协议》和《隐私政策》</span>
          </label>
          
          <button className="login-btn" onClick={handleLogin}>
            <span className="btn-text">立即登录</span>
            <span className="btn-arrow">→</span>
          </button>
          
          <div className="third-party">
            <div className="third-title">
              <span className="line"></span>
              <span className="text">其他登录方式</span>
              <span className="line"></span>
            </div>
            <div className="third-icons">
              <div 
                className="third-icon wechat"
                onClick={() => { setAgreeTerms(true); setIsLoggedIn(true); setUserInfo({ name: '微信用户' }) }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5,14.5C4.5,14.5,1,11.5,1,7.5S4.5,0.5,8.5,0.5c4,0,7.5,3,7.5,7S12.5,14.5,8.5,14.5z M23,14.5c0,4-3.5,7-7.5,7c-4,0-7.5-3-7.5-7s3.5-7,7.5-7C19.5,7.5,23,10.5,23,14.5z M16,8.5c-1,0-1.8,0.8-1.8,1.8s0.8,1.8,1.8,1.8s1.8-0.8,1.8-1.8S17,8.5,16,8.5z M21.5,13c-1,0-1.8,0.8-1.8,1.8s0.8,1.8,1.8,1.8s1.8-0.8,1.8-1.8S22.5,13,21.5,13z"/></svg>
              </div>
              <div 
                className="third-icon apple"
                onClick={() => { setAgreeTerms(true); setIsLoggedIn(true); setUserInfo({ name: 'Apple用户' }) }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.05,20.28c-0.98,0.95-2.05,0.8-3.08,0.35c-1.09-0.46-2.09-0.48-3.24,0 c-1.01,0.44-1.99,0.32-3.02-0.13c-1.19-0.52-2.12-0.49-3.22,0.16c-1.34,0.81-2.08,1.98-1.65,3.65 c0.53,2.06,2.93,3.2,5.48,3.2c2.26,0,4.03-0.88,5.33-1.68c1.35-0.83,2.36-1.79,3.15-2.85c-0.88-0.72-1.65-1.66-1.44-3.01 M12.03,7.25c-0.15-2.23,1.66-4.07,3.74-4.25c0.29,2.58-2.34,4.75-3.74,4.25"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ===== 渲染首页 =====
  const renderOilPage = () => (
    <div className="oil-page">
      {/* 顶部 */}
      <div className="header header-tech">
        <div className="header-left">
          {/* 定位按钮 */}
          <button 
            className={`location-btn ${isLocating ? 'locating' : ''}`}
            onClick={handleLocateCity}
            disabled={isLocating}
            title="自动定位"
          >
            {isLocating ? '📡' : '🎯'}
          </button>
        </div>
        <div className="header-center">
          <div className="city-selector" onClick={() => setShowCityPicker(true)}>
            <span className="city-icon">📍</span>
            <span>{province}{city?.replace(province, '') || ''}{district}</span>
            <span className="city-arrow">▼</span>
          </div>
        </div>
        <div 
          className={`header-right refresh-btn ${loading ? 'spinning' : ''}`} 
          onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500) }}
        >
          <span className="refresh-icon">🔄</span>
        </div>
      </div>
      
      {/* 价格卡片 - 科技感 */}
      <div className={`price-card price-card-tech ${priceAnimating ? 'animating' : ''} ${priceDirection || ''}`}>
        <div className="price-glow"></div>
        <div className="price-main-wrap">
          <div className={`price-main ${priceAnimating ? 'price-pop' : ''}`}>
            {getCurrentPrice()}
          </div>
          <div className="price-unit">元/升</div>
        </div>
        <div className={`price-change ${parseFloat(getPriceChange()) < 0 ? 'down' : 'up'} ${priceAnimating ? 'visible' : ''}`}>
          <span className="change-icon">{parseFloat(getPriceChange()) < 0 ? '↓' : '↑'}</span>
          较上次调整 {Math.abs(parseFloat(getPriceChange()))} 元
        </div>
      </div>
      
      {/* 油号切换 - 科技感Tab */}
      <div className="oil-types">
        {OIL_TYPES.map((type, index) => (
          <div 
            key={type.key}
            className={`oil-btn ${oilType === type.key ? 'active' : ''}`}
            onClick={() => {
              if (oilType !== type.key) {
                setActiveTab(type.key)
              }
              setOilType(type.key)
            }}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <span className="oil-btn-text">{type.label}</span>
            {oilType === type.key && <span className="oil-btn-indicator"></span>}
          </div>
        ))}
      </div>
      
      {/* 涨跌趋势 - 科技感入口 */}
      <div className="view-detail" onClick={() => setSubPage('trend')}>
        <span>涨跌趋势</span>
        <span className="detail-arrow">→</span>
      </div>
      
      {/* 城市选择器弹窗 */}
      {showCityPicker && (
        <div className="city-picker-overlay" onClick={() => setShowCityPicker(false)}>
          <div className="city-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="city-picker-header">
              <span>选择城市</span>
              <span className="city-picker-close" onClick={() => setShowCityPicker(false)}>✕</span>
            </div>
            <div className="city-picker-body">
              {/* 第一列：省份 */}
              <div className="city-picker-col">
                <div className="city-picker-label">① 省份</div>
                <div className="city-picker-list">
                  {provinceOptions.map(p => (
                    <div 
                      key={p} 
                      className={`city-picker-item ${province === p ? 'active' : ''}`}
                      onClick={() => { setProvince(p); setCity(Object.keys(cityData[p].cities)[0]); setDistrict('') }}
                    >{p}</div>
                  ))}
                </div>
              </div>
              {/* 第二列：城市 */}
              <div className="city-picker-col">
                <div className="city-picker-label">② 城市</div>
                <div className="city-picker-list">
                  {currentCityOptions.map(c => (
                    <div 
                      key={c} 
                      className={`city-picker-item ${city === c ? 'active' : ''}`}
                      onClick={() => { setCity(c); setDistrict('') }}
                    >{c}</div>
                  ))}
                </div>
              </div>
              {/* 第三列：区县 */}
              <div className="city-picker-col">
                <div className="city-picker-label">③ 区/县</div>
                <div className="city-picker-list">
                  {currentDistrictOptions.length > 0 ? currentDistrictOptions.map(d => (
                    <div 
                      key={d} 
                      className={`city-picker-item ${district === d ? 'active' : ''}`}
                      onClick={() => setDistrict(d)}
                    >{d}</div>
                  )) : <div className="city-picker-empty">请先选择城市</div>}
                </div>
              </div>
            </div>
            <div className="city-picker-result">
              已选择：{province} {city} {district}
            </div>
            <button className="city-picker-confirm" onClick={() => setShowCityPicker(false)}>完成</button>
          </div>
        </div>
      )}
      
      {/* 加载中 */}
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>数据加载中...</span>
        </div>
      ) : (
        <>
          <div className="section-title">
            <span className="section-title-text">各省油价</span>
            <span className="section-title-line"></span>
          </div>
          <div className={`card province-list ${listScrolling ? 'scrolling' : ''}`}>
            {provinceList.map(([name, data], index) => (
              <div 
                key={name} 
                className="region-item"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="region-info">
                  <span className="region-name">{name}</span>
                  <span className="region-bar">
                    <span 
                      className="region-bar-fill" 
                      style={{ width: `${((data[oilType] - 7) / 3) * 100}%` }}
                    ></span>
                  </span>
                </div>
                <div className="region-price-wrap">
                  <span className="region-price">{data[oilType]}</span>
                  <span className="region-unit">元</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  // ===== 趋势页动画状态 =====
  const [trendAnimating, setTrendAnimating] = useState(false)
  const [chartDrawProgress, setChartDrawProgress] = useState(0)
  const [statValues, setStatValues] = useState({ min: 0, max: 0, current: 0 })
  const [prevStatValues, setPrevStatValues] = useState({ min: 0, max: 0, current: 0 })

  // Tab切换动画
  useEffect(() => {
    if (!history) return
    setTrendAnimating(true)
    
    // 图表绘制动画
    setChartDrawProgress(0)
    const chartTimer = setTimeout(() => {
      setChartDrawProgress(1)
    }, 100)
    
    // 数字变化动画
    const chartData = Object.entries(history.history)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-trendDays)
    const values = chartData.map(([, d]) => d[oilType])
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const currentVal = parseFloat(getCurrentPrice())
    
    setPrevStatValues(statValues)
    setStatValues({ min: minVal, max: maxVal, current: currentVal })
    
    const animTimer = setTimeout(() => setTrendAnimating(false), 800)
    
    return () => {
      clearTimeout(chartTimer)
      clearTimeout(animTimer)
    }
  }, [trendDays, oilType, history])

  // 数字滚动动画
  const AnimatedNumber = ({ value, prevValue }) => {
    const [displayValue, setDisplayValue] = useState(prevValue || value)
    
    useEffect(() => {
      if (value === prevValue) {
        setDisplayValue(value)
        return
      }
      
      const duration = 600
      const steps = 30
      const increment = (value - prevValue) / steps
      let current = prevValue
      let step = 0
      
      const timer = setInterval(() => {
        step++
        current += increment
        setDisplayValue(current)
        if (step >= steps) {
          setDisplayValue(value)
          clearInterval(timer)
        }
      }, duration / steps)
      
      return () => clearInterval(timer)
    }, [value, prevValue])
    
    return <span>{displayValue.toFixed(2)}</span>
  }
  
  // 油耗统计计数器动画组件
  const AnimatedCounter = ({ value, decimals = 0, prefix = '' }) => {
    const [displayValue, setDisplayValue] = useState(0)
    
    useEffect(() => {
      const duration = 1000
      const steps = 40
      const increment = value / steps
      let current = 0
      let step = 0
      
      const timer = setInterval(() => {
        step++
        current += increment
        if (step >= steps) {
          setDisplayValue(value)
          clearInterval(timer)
        } else {
          setDisplayValue(current)
        }
      }, duration / steps)
      
      return () => clearInterval(timer)
    }, [value])
    
    return <span className="animated-counter">{prefix}{displayValue.toFixed(decimals)}</span>
  }

  // ===== 渲染趋势页 =====
  const renderTrendPage = () => {
    const chartData = history 
      ? Object.entries(history.history)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-trendDays) 
      : []
    
    const values = chartData.map(([, d]) => d[oilType])
    const minVal = Math.min(...values) || 0
    const maxVal = Math.max(...values) || 0
    
    // 计算折线路径
    const getPathPoints = () => {
      if (chartData.length < 2) return ''
      return chartData.map(([, d], i) => {
        const progressX = i / (chartData.length - 1)
        const x = 30 + progressX * 260 * chartDrawProgress
        const y = 130 - ((d[oilType] - minVal) / (maxVal - minVal || 1)) * 110
        return `${x},${y}`
      }).join(' ')
    }
    
    return (
      <div className="trend-page">
        {/* 背景装饰 */}
        <div className="trend-bg">
          <div className="trend-grid"></div>
          <div className="trend-glow"></div>
        </div>
        
        <div className="header header-tech">
          <div className="header-left" onClick={() => setSubPage('oil')}>←</div>
          <div className="header-center">油价走势</div>
          <div className="header-right"></div>
        </div>
        
        {/* Tab切换 - 科技感 */}
        <div className="trend-tabs">
          {[7, 30, 90].map((days) => (
            <button 
              key={days}
              className={`trend-tab ${trendDays === days ? 'active' : ''} ${trendAnimating && trendDays === days ? 'switching' : ''}`}
              onClick={() => setTrendDays(days)}
            >
              <span className="tab-text">{days}天</span>
              {trendDays === days && <span className="tab-indicator"></span>}
            </button>
          ))}
        </div>
        
        {/* 当前价格 - 科技感 */}
        <div className={`trend-price-card ${trendAnimating ? 'pulse' : ''}`}>
          <div className="price-glow"></div>
          <div className="trend-price-label">当前油价</div>
          <div className="trend-price-value">
            <AnimatedNumber value={statValues.current} prevValue={prevStatValues.current} />
          </div>
          <div className="trend-price-unit">元/升</div>
        </div>
        
        {/* 图表 - 科技感 */}
        <div className={`trend-chart-card ${trendAnimating ? 'draw' : ''}`}>
          <div className="chart-header">
            <span className="chart-title">价格趋势</span>
            <span className="chart-range">{trendDays}天走势</span>
          </div>
          <svg viewBox="0 0 320 160" className="chart-svg">
            {/* 网格线 */}
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4CAF50" />
                <stop offset="50%" stopColor="#2196F3" />
                <stop offset="100%" stopColor="#9C27B0" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(76, 175, 80, 0.3)" />
                <stop offset="100%" stopColor="rgba(76, 175, 80, 0)" />
              </linearGradient>
            </defs>
            
            {/* Y轴标签 */}
            <text x="5" y="15" fill="#666" fontSize="10">{maxVal.toFixed(2)}</text>
            <text x="5" y="145" fill="#666" fontSize="10">{minVal.toFixed(2)}</text>
            
            {/* 渐变填充区域 */}
            {chartData.length > 1 && chartDrawProgress > 0 && (
              <polygon
                fill="url(#areaGradient)"
                points={`30,130 ${chartData.map(([, d], i) => {
                  const progressX = i / (chartData.length - 1)
                  const x = 30 + progressX * 260 * chartDrawProgress
                  const y = 130 - ((d[oilType] - minVal) / (maxVal - minVal || 1)) * 110
                  return `${x},${y}`
                }).join(' ')} ${30 + 260 * chartDrawProgress},130`}
              />
            )}
            
            {/* 折线 */}
            {chartData.length > 1 && (
              <polyline
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={chartDrawProgress * 1000}
                strokeDashoffset={chartDrawProgress * 100}
                points={getPathPoints()}
                className="chart-line"
              />
            )}
            
            {/* 数据点 */}
            {chartData.map(([date, d], i) => {
              const progressX = i / (chartData.length - 1)
              const x = 30 + progressX * 260 * chartDrawProgress
              const y = 130 - ((d[oilType] - minVal) / (maxVal - minVal || 1)) * 110
              return (
                <g key={date} className="chart-point" style={{ opacity: chartDrawProgress }}>
                  <circle 
                    cx={x} 
                    cy={y} 
                    r="4" 
                    fill="white" 
                    stroke="#4CAF50" 
                    strokeWidth="2"
                    className="point-circle"
                  />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r="8" 
                    fill="transparent" 
                    stroke="#4CAF50" 
                    strokeWidth="1"
                    className="point-ripple"
                  />
                </g>
              )
            })}
          </svg>
        </div>
        
        {/* 统计卡片 - 科技感 */}
        <div className={`trend-stats ${trendAnimating ? 'animate' : ''}`}>
          <div className="trend-stat-card">
            <div className="stat-icon stat-icon-low">↓</div>
            <div className="stat-content">
              <div className="stat-value">
                <AnimatedNumber value={statValues.min} prevValue={prevStatValues.min} />
              </div>
              <div className="stat-label">最低价</div>
            </div>
            <div className="stat-glow stat-glow-low"></div>
          </div>
          
          <div className="trend-stat-card">
            <div className="stat-icon stat-icon-high">↑</div>
            <div className="stat-content">
              <div className="stat-value">
                <AnimatedNumber value={statValues.max} prevValue={prevStatValues.max} />
              </div>
              <div className="stat-label">最高价</div>
            </div>
            <div className="stat-glow stat-glow-high"></div>
          </div>
          
          <div className="trend-stat-card">
            <div className="stat-icon stat-icon-current">◆</div>
            <div className="stat-content">
              <div className="stat-value">
                <AnimatedNumber value={statValues.current} prevValue={prevStatValues.current} />
              </div>
              <div className="stat-label">当前价</div>
            </div>
            <div className="stat-glow stat-glow-current"></div>
          </div>
        </div>
      </div>
    )
  }

  // ===== 渲染出行页-加油站 =====
  const renderTripStations = () => (
    <div className="station-list">
      {stationLoading ? (
        <div className="loading-station">
          <div className="loading-spinner"></div>
          <div>正在搜索附近加油站...</div>
        </div>
      ) : (
        <div className="station-list-content">
          <div className="station-list-header">
            <span className="station-count">找到 <strong>{stations.length}</strong> 个加油站</span>
          </div>
          {stations.map((station, index) => (
            <div 
              key={station.id} 
              className="station-card"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="station-card-header">
                <div className="station-brand">{station.brand}</div>
                <div className="station-distance">
                  <span className="distance-icon">📍</span>
                  {station._distance ? `${station._distance.toFixed(1)}km` : station.distance}
                </div>
              </div>
              <div className="station-name">{station.name}</div>
              <div className="station-address">
                <span className="address-icon">🏠</span>
                {station.address}
              </div>
              <div className={`station-discount ${(station.discount || '').includes('降') ? 'has-discount' : ''}`}>
                {(station.discount || '').includes('降') ? (
                  <>
                    <span className="discount-tag">特惠</span>
                    {station.discount}
                  </>
                ) : (
                  <span className="discount-none">{station.discount || '暂无优惠'}</span>
                )}
              </div>
              <div className="station-btns">
                <button 
                  className="station-btn subscribe-btn"
                  onClick={() => handleSubscribe(station)}
                >
                  <span className="btn-icon">🔔</span>
                  <span>订阅</span>
                </button>
                <button 
                  className="station-btn nav-btn"
                  onClick={() => handleNavigate(station)}
                >
                  <span className="btn-icon">🧭</span>
                  <span>导航</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ===== 油耗统计动画状态 =====
  const [fuelStatsAnimate, setFuelStatsAnimate] = useState(false)
  const [fuelListAnimate, setFuelListAnimate] = useState(false)
  const [displayStats, setDisplayStats] = useState({ avgFuel: 0, totalLiters: 0, totalPrice: 0 })
  
  // 油耗统计数字动画
  useEffect(() => {
    if (tripSubPage !== 'fuel') return
    
    const totalLiters = fuelRecords.reduce((sum, r) => sum + r.liters, 0)
    const totalDistance = fuelRecords.reduce((sum, r) => sum + r.distance, 0)
    const totalPrice = fuelRecords.reduce((sum, r) => sum + r.price, 0)
    const targetAvgFuel = totalDistance > 0 ? ((totalLiters / totalDistance) * 100).toFixed(1) : 0
    
    // 数字滚动动画
    const duration = 800
    const steps = 30
    const startStats = { ...displayStats }
    const targetStats = { 
      avgFuel: parseFloat(targetAvgFuel), 
      totalLiters, 
      totalPrice 
    }
    
    setFuelStatsAnimate(true)
    setFuelListAnimate(true)
    
    const timer = setInterval(() => {
      setDisplayStats(prev => {
        const newStats = { ...prev }
        Object.keys(targetStats).forEach(key => {
          const diff = targetStats[key] - startStats[key]
          const stepValue = diff / steps
          const currentStep = (prev[key] - startStats[key]) / stepValue
          if (currentStep < steps) {
            newStats[key] = prev[key] + stepValue
          } else {
            newStats[key] = targetStats[key]
          }
        })
        return newStats
      })
    }, duration / steps)
    
    setTimeout(() => {
      clearInterval(timer)
      setDisplayStats(targetStats)
      setFuelStatsAnimate(false)
    }, duration)
    
    return () => clearInterval(timer)
  }, [tripSubPage, fuelRecords.length])

  // ===== 渲染出行页-油耗 =====
  const renderTripFuel = () => {
    return (
      <div className="fuel-page">
        {/* 统计卡片 - 科技感 */}
        <div className={`fuel-stats fuel-stats-tech ${fuelStatsAnimate ? 'animate' : ''}`}>
          <div className="fuel-stat-card">
            <div className="fuel-stat-icon fuel-stat-icon-avg">⚡</div>
            <div className="fuel-stat-inner">
              <div className="fuel-stat-value">
                <AnimatedCounter value={displayStats.avgFuel} decimals={1} />
              </div>
              <div className="fuel-stat-label">百公里油耗</div>
            </div>
            <div className="fuel-stat-glow fuel-stat-glow-avg"></div>
          </div>
          
          <div className="fuel-stat-card">
            <div className="fuel-stat-icon fuel-stat-icon-liters">🛢️</div>
            <div className="fuel-stat-inner">
              <div className="fuel-stat-value">
                <AnimatedCounter value={displayStats.totalLiters} decimals={1} />
                <span className="fuel-stat-unit">L</span>
              </div>
              <div className="fuel-stat-label">总油量</div>
            </div>
            <div className="fuel-stat-glow fuel-stat-glow-liters"></div>
          </div>
          
          <div className="fuel-stat-card">
            <div className="fuel-stat-icon fuel-stat-icon-price">💰</div>
            <div className="fuel-stat-inner">
              <div className="fuel-stat-value">
                <AnimatedCounter value={displayStats.totalPrice} decimals={0} prefix="¥" />
              </div>
              <div className="fuel-stat-label">总花费</div>
            </div>
            <div className="fuel-stat-glow fuel-stat-glow-price"></div>
          </div>
        </div>
        
        {/* 加油记录标题 */}
        <div className="fuel-list-header">
          <div className="fuel-list-title-wrap">
            <span className="fuel-list-icon">📋</span>
            <span className="fuel-list-title">加油记录</span>
            <span className="fuel-list-count">{fuelRecords.length}条</span>
          </div>
          <button className="add-fuel-btn" onClick={() => setShowAddFuel(true)}>
            <span className="add-icon">+</span>
            <span>添加记录</span>
          </button>
        </div>
        
        {/* 加油记录列表 */}
        <div className="fuel-records">
          {fuelRecords.length === 0 ? (
            <div className="fuel-empty">
              <div className="fuel-empty-icon">🚗</div>
              <div className="fuel-empty-text">暂无加油记录</div>
              <div className="fuel-empty-hint">点击上方"添加记录"开始追踪油耗</div>
            </div>
          ) : (
            fuelRecords.map((record, index) => (
              <div 
                key={record.id} 
                className={`fuel-record-card ${fuelListAnimate ? 'animate' : ''}`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="fuel-record-left">
                  <div className="fuel-record-date">{record.date}</div>
                  <div className="fuel-record-detail">
                    <span className="fuel-record-distance">🚗 {record.distance}km</span>
                    <span className="fuel-record-liters">⛽ {record.liters}L</span>
                  </div>
                </div>
                <div className="fuel-record-right">
                  <div className="fuel-record-price">¥{record.price}</div>
                  <div className="fuel-record-price-perL">
                    ¥{(record.price / record.liters).toFixed(2)}/L
                  </div>
                </div>
                <div className="fuel-record-delete" onClick={() => {
                  if (confirm('确定删除这条记录?')) {
                    setFuelRecords(fuelRecords.filter(r => r.id !== record.id))
                  }
                }}>×</div>
              </div>
            ))
          )}
        </div>
        
        {/* 添加弹窗 */}
        {showAddFuel && (
          <AddFuelForm 
            onSave={record => {
              setFuelRecords([record, ...fuelRecords])
              setShowAddFuel(false)
            }} 
            onClose={() => setShowAddFuel(false)} 
          />
        )}
      </div>
    )
  }

  // ===== 渲染出行页 =====
  const renderTripPage = () => (
    <div className="trip-page">
      <div className="trip-header">
        <div className="trip-header-content">
          <div className="trip-title">🚗 出行加油</div>
          <div className="trip-subtitle">一键导航 优惠加油</div>
        </div>
        <button 
          className={`location-btn ${locationLoading ? 'locating' : ''} ${location ? 'located' : ''}`}
          onClick={handleLocation}
        >
          <span className="location-icon">📍</span>
          <span className="location-text">
            {locationLoading ? '定位中...' : location ? location : '定位'}
          </span>
          <span className="location-pulse"></span>
        </button>
      </div>
      
      <div className="trip-tabs">
        <button 
          className={`trip-tab ${tripSubPage === 'stations' ? 'active' : ''}`}
          onClick={() => setTripSubPage('stations')}
        >
          <span className="trip-tab-icon">⛽</span>
          <span>加油站</span>
        </button>
        <button 
          className={`trip-tab ${tripSubPage === 'fuel' ? 'active' : ''}`}
          onClick={() => setTripSubPage('fuel')}
        >
          <span className="trip-tab-icon">📊</span>
          <span>油耗记录</span>
        </button>
      </div>
      
      {tripSubPage === 'stations' ? renderTripStations() : renderTripFuel()}
    </div>
  )

  // ===== 我的页面动画状态 =====
  const [myPageAnimating, setMyPageAnimating] = useState(false)
  const [menuItemsAnimate, setMenuItemsAnimate] = useState(false)
  
  // 我的页面切换动画
  useEffect(() => {
    setMyPageAnimating(true)
    setMenuItemsAnimate(false)
    setTimeout(() => {
      setMyPageAnimating(false)
      if (mySubPage === 'profile') {
        setMenuItemsAnimate(true)
      }
    }, 100)
  }, [mySubPage])

  // ===== 渲染我的页 =====
  const renderMyPage = () => {
    // Profile
    if (mySubPage === 'profile') {
      return (
        <div className={`my-page ${myPageAnimating ? 'animate' : ''}`}>
          {/* 背景装饰 */}
          <div className="my-page-bg">
            <div className="my-page-grid"></div>
            <div className="my-page-glow-1"></div>
            <div className="my-page-glow-2"></div>
          </div>
          
          <div className="profile-header">
            <div className="avatar">
              <span className="avatar-icon">👤</span>
            </div>
            <div className="profile-info">
              <div className="profile-name">{userInfo?.name || '未登录'}</div>
              <div className="profile-phone">{userInfo?.phone || ''}</div>
            </div>
          </div>
          
          <div className="menu-list">
            <div 
              className={`menu-item ${menuItemsAnimate ? 'animate' : ''}`}
              onClick={() => setMySubPage('notify')}
              style={{ animationDelay: '0.05s' }}
            >
              <span className="menu-item-icon">🔔</span>
              <span className="menu-item-text">消息提醒</span>
              <span className="menu-item-arrow">›</span>
            </div>
            <div 
              className={`menu-item ${menuItemsAnimate ? 'animate' : ''}`}
              onClick={() => alert('数据同步功能\n\n您的数据已自动同步到云端，随时随地可查看历史记录。')}
              style={{ animationDelay: '0.1s' }}
            >
              <span className="menu-item-icon">🔄</span>
              <span className="menu-item-text">数据同步</span>
              <span className="menu-item-arrow">›</span>
            </div>
            <div 
              className={`menu-item ${menuItemsAnimate ? 'animate' : ''}`}
              onClick={() => setMySubPage('settings')}
              style={{ animationDelay: '0.15s' }}
            >
              <span className="menu-item-icon">⚙️</span>
              <span className="menu-item-text">设置</span>
              <span className="menu-item-arrow">›</span>
            </div>
            <div 
              className={`menu-item ${menuItemsAnimate ? 'animate' : ''}`}
              onClick={() => setMySubPage('help')}
              style={{ animationDelay: '0.2s' }}
            >
              <span className="menu-item-icon">❓</span>
              <span className="menu-item-text">帮助反馈</span>
              <span className="menu-item-arrow">›</span>
            </div>
          </div>
          
          {isLoggedIn && (
            <button className="logout-btn" onClick={handleLogout}>退出登录</button>
          )}
        </div>
      )
    }
    
    // 提醒设置
    if (mySubPage === 'notify') {
      return (
        <div className={`notify-page ${myPageAnimating ? 'animate' : ''}`}>
          <div className="notify-header">
            <div className="notify-header-left" onClick={() => setMySubPage('profile')}>←</div>
            <div className="notify-header-center">消息提醒</div>
            <div className="notify-header-right"></div>
          </div>
          
          <div className="toggle-card">
            <div className="toggle-item">
              <div className="toggle-item-left">
                <div className="toggle-item-icon up">📈</div>
                <div>
                  <div className="toggle-item-text">油价上涨提醒</div>
                  <div className="toggle-item-desc">油价上调时推送通知</div>
                </div>
              </div>
              <div 
                className={`toggle-switch ${toggles.priceUp ? 'active' : ''}`}
                onClick={() => setToggles({...toggles, priceUp: !toggles.priceUp})}
              />
            </div>
            <div className="toggle-item">
              <div className="toggle-item-left">
                <div className="toggle-item-icon down">📉</div>
                <div>
                  <div className="toggle-item-text">油价下跌提醒</div>
                  <div className="toggle-item-desc">油价下调时推送通知</div>
                </div>
              </div>
              <div 
                className={`toggle-switch ${toggles.priceDown ? 'active' : ''}`}
                onClick={() => setToggles({...toggles, priceDown: !toggles.priceDown})}
              />
            </div>
            <div className="toggle-item">
              <div className="toggle-item-left">
                <div className="toggle-item-icon fuel">⛽</div>
                <div>
                  <div className="toggle-item-text">油耗过低提醒</div>
                  <div className="toggle-item-desc">油耗低于阈值时提醒</div>
                </div>
              </div>
              <div 
                className={`toggle-switch ${toggles.lowFuel ? 'active' : ''}`}
                onClick={() => setToggles({...toggles, lowFuel: !toggles.lowFuel})}
              />
            </div>
          </div>
        </div>
      )
    }
    
    // 设置
    if (mySubPage === 'settings') {
      return (
        <div className={`settings-page ${myPageAnimating ? 'animate' : ''}`}>
          <div className="settings-header">
            <div className="notify-header-left" onClick={() => setMySubPage('profile')}>←</div>
            <div className="notify-header-center">设置</div>
            <div className="notify-header-right"></div>
          </div>
          
          <div className="settings-card">
            <div className="settings-item" onClick={() => alert('深色模式\n\n系统已自动跟随设备主题设置。')}>
              <div className="settings-item-left">
                <span className="settings-item-icon">🌙</span>
                <span className="settings-item-text">深色模式</span>
              </div>
              <span className="settings-item-arrow">›</span>
            </div>
            <div className="settings-item" onClick={() => setMySubPage('notify')}>
              <div className="settings-item-left">
                <span className="settings-item-icon">🔔</span>
                <span className="settings-item-text">通知设置</span>
              </div>
              <span className="settings-item-arrow">›</span>
            </div>
            <div className="settings-item" onClick={() => {
              if (confirm('确定清除缓存？')) {
                alert('缓存已清除')
              }
            }}>
              <div className="settings-item-left">
                <span className="settings-item-icon">🗑️</span>
                <span className="settings-item-text">清除缓存</span>
              </div>
              <span className="settings-item-arrow">›</span>
            </div>
            <div className="settings-item" onClick={() => alert('油价守护者 v1.0.0\n\n智能油价监测，省心加油')}>
              <div className="settings-item-left">
                <span className="settings-item-icon">ℹ️</span>
                <span className="settings-item-text">关于我们</span>
              </div>
              <span className="settings-item-arrow">›</span>
            </div>
          </div>
        </div>
      )
    }
    
    // 帮助反馈
    if (mySubPage === 'help') {
      return (
        <div className={`help-page ${myPageAnimating ? 'animate' : ''}`}>
          <div className="help-header">
            <div className="notify-header-left" onClick={() => setMySubPage('profile')}>←</div>
            <div className="notify-header-center">帮助反馈</div>
            <div className="notify-header-right"></div>
          </div>
          
          <div className="help-card">
            <div className="help-content">
              <div className="help-icon">💬</div>
              <div className="help-title">联系我们</div>
              <div className="help-desc">
                如有任何问题或建议，欢迎随时联系我们
              </div>
              <div className="help-contact">
                <div className="help-contact-item">
                  <span className="help-contact-icon">📞</span>
                  <span>客服热线: 400-123-4567</span>
                </div>
                <div className="help-contact-item">
                  <span className="help-contact-icon">✉️</span>
                  <span>邮箱: support@oilguard.com</span>
                </div>
                <div className="help-contact-item">
                  <span className="help-contact-icon">⏰</span>
                  <span>服务时间: 9:00 - 21:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  // ===== 添加加油记录表单 - 科技感弹窗 =====
  const AddFuelForm = ({ onSave, onClose }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [distance, setDistance] = useState('')
    const [liters, setLiters] = useState('')
    const [price, setPrice] = useState('')
    const [formAnimate, setFormAnimate] = useState(false)
    
    useEffect(() => {
      setFormAnimate(true)
    }, [])
    
    const handleSubmit = () => {
      if (!distance || !liters || !price) {
        alert('请填写所有字段')
        return
      }
      onSave({
        id: Date.now(),
        date,
        distance: parseInt(distance),
        liters: parseFloat(liters),
        price: parseInt(price)
      })
    }
    
    return (
      <div className="modal-mask modal-mask-tech" onClick={onClose}>
        <div className={`modal-content modal-content-tech ${formAnimate ? 'animate' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="modal-tech-glow"></div>
          <div className="modal-header-tech">
            <div className="modal-icon-tech">⛽</div>
            <div className="modal-title-tech">添加加油记录</div>
          </div>
          
          <div className="form-group-tech">
            <label className="form-label-tech">
              <span className="form-label-icon">📅</span>
              日期
            </label>
            <input 
              type="date" 
              className="form-input-tech" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
            />
          </div>
          
          <div className="form-group-tech">
            <label className="form-label-tech">
              <span className="form-label-icon">🚗</span>
              行驶里程(km)
            </label>
            <input 
              type="number" 
              className="form-input-tech" 
              placeholder="如: 520" 
              value={distance} 
              onChange={e => setDistance(e.target.value)} 
            />
          </div>
          
          <div className="form-group-tech">
            <label className="form-label-tech">
              <span className="form-label-icon">🛢️</span>
              加油量(升)
            </label>
            <input 
              type="number" 
              className="form-input-tech" 
              placeholder="如: 42" 
              value={liters} 
              onChange={e => setLiters(e.target.value)} 
            />
          </div>
          
          <div className="form-group-tech">
            <label className="form-label-tech">
              <span className="form-label-icon">💰</span>
              加油金额(元)
            </label>
            <input 
              type="number" 
              className="form-input-tech" 
              placeholder="如: 328" 
              value={price} 
              onChange={e => setPrice(e.target.value)} 
            />
          </div>
          
          <div className="form-btns-tech">
            <button className="btn-cancel-tech" onClick={onClose}>
              <span>取消</span>
            </button>
            <button className="btn-save-tech" onClick={handleSubmit}>
              <span>保存记录</span>
              <span className="btn-save-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== 主渲染 =====
  if (!isLoggedIn) {
    return renderLoginPage()
  }
  
  return (
    <div className="app">
      {page === 'oil' && (
        subPage === 'oil' ? renderOilPage() : renderTrendPage()
      )}
      
      {page === 'trip' && renderTripPage()}
      {page === 'my' && renderMyPage()}
      
      {/* 底部导航 */}
      <div className="bottom-nav">
        <div 
          className={`nav-item ${page === 'oil' ? 'active' : ''}`}
          onClick={() => setPage('oil')}
        >
          <div className="nav-icon">⛽</div>
          <div className="nav-label">油价</div>
        </div>
        <div 
          className={`nav-item ${page === 'trip' ? 'active' : ''}`}
          onClick={() => setPage('trip')}
        >
          <div className="nav-icon">🚗</div>
          <div className="nav-label">出行</div>
        </div>
        <div 
          className={`nav-item ${page === 'my' ? 'active' : ''}`}
          onClick={() => setPage('my')}
        >
          <div className="nav-icon">👤</div>
          <div className="nav-label">我的</div>
        </div>
      </div>
      
      {showLoginSuccess && <div className="toast">登录成功</div>}
    </div>
  )
}

export default App
