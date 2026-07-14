import 'package:flutter_test/flutter_test.dart'; import 'package:sawn/main.dart';
void main(){testWidgets('renders Sawn splash',(tester) async{await tester.pumpWidget(const SawnApp()); expect(find.text('صَون'), findsOneWidget);});}
